import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../init";
import {
  analyzeInstagramProfile,
  extractInstagramHandle,
  LeadAnalysisError,
} from "@/server/integrations/anthropic/lead-magnet-prompt";
import { verifyTurnstile } from "@/server/integrations/turnstile/verify";
import {
  addBudgetSpend,
  getWeeklySpendCents,
  leadMagnetEmailLimiter,
  leadMagnetIpLimiter,
} from "@/lib/ratelimit";
// import { sendLeadMagnetReport } from "@/server/integrations/resend/send-lead-magnet";
import { trackEvent } from "@/lib/analytics/events";
import { env } from "@/lib/env";
import type { LeadAnalysis } from "@/server/integrations/anthropic/schema";

const analyzeInput = z.object({
  email: z.string().email().max(200),
  instagramUrl: z
    .string()
    .trim()
    .regex(/^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?(\?.*)?$/, {
      message: "Inserisci un URL Instagram valido, es. https://www.instagram.com/tuo_handle",
    }),
  marketingConsent: z.boolean(),
  turnstileToken: z.string().min(1).max(4000),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(120).optional(),
    })
    .optional(),
  referrerUrl: z.string().max(500).optional(),
});

function hashIp(ip: string | undefined) {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 40);
}

function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
}

export const leadMagnetRouter = createTRPCRouter({
  /**
   * Submit an Instagram URL + email and receive an editorial analysis.
   * Flow:
   *   1. Verify Turnstile
   *   2. Rate limit (IP + email)
   *   3. Insert lead row (status=new)
   *   4. Check weekly budget
   *   5. Call Claude with 1 retry on invalid JSON
   *   6. Update lead with analysis + tokens + cost
   *   7. Fire-and-forget email (don't await)
   *   8. Track analytics event
   *   9. Return analysis to the client
   */
  analyze: publicProcedure
    .input(analyzeInput)
    .mutation(async ({ ctx, input }): Promise<{ leadId: string; analysis: LeadAnalysis }> => {
      const headers = new Headers();
      // Context headers not available here; tRPC fetch adapter exposes them via ctx extension (future work)
      const ip = getClientIp(headers);

      // 1. Turnstile
      const tsOk = await verifyTurnstile(input.turnstileToken, ip);
      if (!tsOk) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Verifica di sicurezza fallita. Ricarica la pagina e riprova.",
        });
      }

      // 2. Rate limit (IP + email)
      const ipKey = hashIp(ip) ?? "anon";
      const ipRl = await leadMagnetIpLimiter.limit(ipKey);
      if (!ipRl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Hai già richiesto un'analisi di recente. Riprova tra qualche minuto.",
        });
      }
      const emailRl = await leadMagnetEmailLimiter.limit(input.email.toLowerCase());
      if (!emailRl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Hai già richiesto più analisi oggi con questa email. Riprova domani.",
        });
      }

      // 3. Insert lead row (status=new)
      const handle = extractInstagramHandle(input.instagramUrl);
      const lead = await ctx.db.lead.create({
        data: {
          email: input.email.toLowerCase(),
          instagramUrl: input.instagramUrl,
          instagramHandle: handle,
          marketingConsent: input.marketingConsent,
          utmSource: input.utm?.source,
          utmMedium: input.utm?.medium,
          utmCampaign: input.utm?.campaign,
          referrerUrl: input.referrerUrl,
          ipHash: hashIp(ip),
          turnstileVerified: true,
        },
        select: { id: true, email: true },
      });

      // 4. Budget check (soft, we still let this one go through but log/alert)
      const spent = await getWeeklySpendCents();
      if (spent > (env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000)) {
        await ctx.db.lead.update({
          where: { id: lead.id },
          data: {
            status: "new",
            analysisError: "weekly_budget_exceeded",
          },
        });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Stiamo ricevendo molte richieste oggi. Ti invieremo l'analisi via email appena possibile.",
        });
      }

      // 5. Call Claude (1 retry on invalid JSON)
      let result;
      try {
        result = await analyzeInstagramProfile({
          email: input.email,
          instagramUrl: input.instagramUrl,
          instagramHandle: handle,
        });
      } catch (e) {
        if (e instanceof LeadAnalysisError && e.code === "invalid_output") {
          // one retry
          try {
            result = await analyzeInstagramProfile({
              email: input.email,
              instagramUrl: input.instagramUrl,
              instagramHandle: handle,
            });
          } catch (e2) {
            console.error("[leadMagnet] Claude retry failed", e2);
            await ctx.db.lead.update({
              where: { id: lead.id },
              data: {
                analysisError: e2 instanceof Error ? e2.message.slice(0, 500) : "retry failed",
              },
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `[claude_retry_failed] ${
                e2 instanceof Error ? e2.message.slice(0, 200) : "unknown"
              }`,
            });
          }
        } else {
          console.error("[leadMagnet] Claude call failed", e);
          const errMsg = e instanceof Error ? e.message : "api error";
          await ctx.db.lead.update({
            where: { id: lead.id },
            data: { analysisError: errMsg.slice(0, 500) },
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `[claude_error] ${errMsg.slice(0, 200)}`,
          });
        }
      }

      // 6. Update lead with analysis
      await ctx.db.lead.update({
        where: { id: lead.id },
        data: {
          status: "analyzed",
          analysisJson: result.analysis as unknown as object,
          analysisModel: result.model,
          analysisTokensIn: result.tokensIn,
          analysisTokensOut: result.tokensOut,
          analysisCostCents: result.costCents,
          analysisError: null,
        },
      });
      await addBudgetSpend(result.costCents);

      // 7. Fire-and-forget email — DISABILITATO temporaneamente.
      // Riattiva rimuovendo il commento quando vuoi inviare il report anche via email.
      // sendLeadMagnetReport({
      //   leadId: lead.id,
      //   to: lead.email,
      //   analysis: result.analysis,
      // }).catch((err) => {
      //   console.error("[leadMagnet] email send failed", err);
      // });

      // 8. Track
      await trackEvent({
        userId: null,
        name: "lead_magnet_submitted",
        properties: {
          leadId: lead.id,
          handle,
          utm: input.utm,
          costCents: result.costCents,
        },
      }).catch(() => {});

      return { leadId: lead.id, analysis: result.analysis };
    }),

  /**
   * Admin: paginated list of leads + basic KPIs.
   */
  adminList: adminProcedure
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        status: z
          .enum(["new", "analyzed", "emailed", "converted", "bounced"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const leads = await ctx.db.lead.findMany({
        where: input.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        select: {
          id: true,
          email: true,
          instagramHandle: true,
          instagramUrl: true,
          status: true,
          analysisCostCents: true,
          emailSentAt: true,
          convertedUserId: true,
          convertedAt: true,
          createdAt: true,
        },
      });

      const nextCursor = leads.length > input.limit ? leads[input.limit]?.id : null;
      const items = leads.slice(0, input.limit);

      const [total, analyzed, converted, weeklySpend] = await Promise.all([
        ctx.db.lead.count(),
        ctx.db.lead.count({
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
        ctx.db.lead.count({
          where: {
            convertedUserId: { not: null },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        getWeeklySpendCents(),
      ]);

      return {
        items,
        nextCursor,
        kpi: {
          totalLeads: total,
          leadsLast30d: analyzed,
          convertedLast30d: converted,
          conversionRate: analyzed ? converted / analyzed : 0,
          weeklySpendCents: weeklySpend,
          weeklySpendCapCents: env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000,
        },
      };
    }),
});
