import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { LeadSource } from "@prisma/client";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../init";
import type { TRPCContext } from "../context";
import {
  analyzeInstagramProfile,
  downloadInstagramImages,
  extractInstagramHandle,
  LeadAnalysisError,
  type DownloadedImages,
} from "@/server/integrations/anthropic/lead-magnet-prompt";
import {
  analyzeProjectBrief,
  ProjectAnalysisError,
} from "@/server/integrations/anthropic/project-analysis-prompt";
import {
  scrapeInstagramProfile,
  ApifyScrapeError,
  type ScrapedInstagramProfile,
} from "@/server/integrations/apify/client";
import { uploadLeadImages } from "@/server/integrations/supabase/upload-images";
import { verifyTurnstile } from "@/server/integrations/turnstile/verify";
import {
  addBudgetSpend,
  getWeeklySpendCents,
  leadMagnetEmailLimiter,
  leadMagnetIpLimiter,
  leadMagnetProjectEmailLimiter,
  leadMagnetProjectIpLimiter,
} from "@/lib/ratelimit";
// import { sendLeadMagnetReport } from "@/server/integrations/resend/send-lead-magnet";
import { trackEvent } from "@/lib/analytics/events";
import { env } from "@/lib/env";
import {
  createPasswordlessUser,
  generateMagicLinkUrl,
} from "@/lib/supabase/admin";

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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Enforce "one analysis per month per email, per lead magnet source".
 * Throws TOO_MANY_REQUESTS with an IT-formatted date if the most recent
 * analyzed lead for that email+source is within the last 30 days.
 */
async function checkMonthlyLimit(
  db: TRPCContext["db"],
  email: string,
  source: LeadSource,
): Promise<void> {
  const last = await db.lead.findFirst({
    where: {
      email,
      source,
      status: { in: ["analyzed", "emailed", "converted"] },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < THIRTY_DAYS_MS) {
    const nextAvailable = new Date(last.createdAt.getTime() + THIRTY_DAYS_MS);
    const dateIT = nextAvailable.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `[monthly_limit] Hai già fatto un'analisi questo mese. Potrai richiederne una nuova il ${dateIT}.`,
    });
  }
}

const analyzeProjectInput = z.object({
  email: z.string().email().max(200),
  projectBrief: z.string().trim().min(120).max(4000),
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
    .mutation(
      async ({ ctx, input }): Promise<{ leadId: string; redirectUrl: string }> => {
        const headers = new Headers();
        const ip = getClientIp(headers);
        const emailLower = input.email.toLowerCase();

        // 1. Turnstile
        const tsOk = await verifyTurnstile(input.turnstileToken, ip);
        if (!tsOk) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Verifica di sicurezza fallita. Ricarica la pagina e riprova.",
          });
        }

        // 2. Rate limit IP
        const ipKey = hashIp(ip) ?? "anon";
        const ipRl = await leadMagnetIpLimiter.limit(ipKey);
        if (!ipRl.success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Hai già richiesto un'analisi di recente. Riprova tra qualche minuto.",
          });
        }

        // 3. Email already registered? → reject with a login CTA
        const existingUser = await ctx.db.user.findUnique({
          where: { email: emailLower },
          select: { id: true },
        });
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "[email_exists] Esiste già un account con questa email. Accedi per vedere la tua analisi.",
          });
        }

        // 4. One-analysis-per-month limit for this lead magnet source.
        await checkMonthlyLimit(ctx.db, emailLower, "lead_magnet_ig");

        // 5. Soft email-day limit (Upstash, smaller window)
        const emailRl = await leadMagnetEmailLimiter.limit(emailLower);
        if (!emailRl.success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Hai già richiesto più analisi oggi con questa email.",
          });
        }

        // 6. Insert lead row (status=new)
        const handle = extractInstagramHandle(input.instagramUrl);
        const lead = await ctx.db.lead.create({
          data: {
            email: emailLower,
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

        // 7. Weekly budget check — deny early if we've already blown the cap
        const spent = await getWeeklySpendCents();
        if (spent > (env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000)) {
          await ctx.db.lead.update({
            where: { id: lead.id },
            data: { analysisError: "weekly_budget_exceeded" },
          });
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Stiamo ricevendo molte richieste questa settimana. Riprova tra qualche giorno.",
          });
        }

        // 8a. Scrape Instagram (best-effort: falls back to blind analysis)
        let scraped: ScrapedInstagramProfile | null = null;
        if (handle) {
          try {
            scraped = await scrapeInstagramProfile(handle);
          } catch (e) {
            if (e instanceof ApifyScrapeError) {
              console.warn(`[leadMagnet] scrape fallback (${e.code}): ${e.message}`);
            } else {
              console.warn("[leadMagnet] scrape unknown error", e);
            }
            scraped = null;
          }
        }

        // 8b. Download images once (used both for Claude prompt AND for storage upload)
        let downloadedImages: DownloadedImages | undefined;
        if (scraped && scraped.latestPosts.length > 0) {
          downloadedImages = await downloadInstagramImages(scraped.latestPosts);
        }

        // 8c. Call Claude (1 retry on invalid JSON)
        let result;
        try {
          result = await analyzeInstagramProfile({
            email: input.email,
            instagramUrl: input.instagramUrl,
            instagramHandle: handle,
            scraped,
            preloadedImages: downloadedImages,
          });
        } catch (e) {
          if (e instanceof LeadAnalysisError && e.code === "invalid_output") {
            try {
              result = await analyzeInstagramProfile({
                email: input.email,
                instagramUrl: input.instagramUrl,
                instagramHandle: handle,
                scraped,
                preloadedImages: downloadedImages,
              });
            } catch (e2) {
              console.error("[leadMagnet] Claude retry failed", e2);
              await ctx.db.lead.update({
                where: { id: lead.id },
                data: {
                  analysisError:
                    e2 instanceof Error ? e2.message.slice(0, 500) : "retry failed",
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

        // 9a. Upload images to Supabase Storage (parallel with DB save for speed)
        const uploadPromise = downloadedImages
          ? uploadLeadImages({ leadId: lead.id, images: downloadedImages })
          : Promise.resolve<Array<string | null>>([]);

        // 9b. Save analysis + budget accounting
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

        // 9c. Commit the uploaded image URLs (best-effort — if this fails
        // the analysis is still usable, just without the photo grid)
        try {
          const uploaded = await uploadPromise;
          const publicUrls = uploaded.filter((u): u is string => !!u);
          if (publicUrls.length > 0) {
            await ctx.db.lead.update({
              where: { id: lead.id },
              data: { scrapedImages: publicUrls },
            });
          }
        } catch (e) {
          console.warn(
            "[leadMagnet] image upload/save failed",
            e instanceof Error ? e.message : e,
          );
        }

        // 10. Create a passwordless Supabase auth user (triggers handle_new_auth_user,
        // which auto-links this lead to the new user via email match).
        let redirectUrl: string;
        try {
          await createPasswordlessUser({
            email: emailLower,
            fullName: scraped?.fullName ?? null,
            createdVia: "lead_magnet",
          });
        } catch (e) {
          console.error("[leadMagnet] createPasswordlessUser failed", e);
          // Fallback: lead is saved but account creation failed. Still return
          // a usable redirect to a public-ish internal view pointing to the
          // login page where the user can request a magic link.
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `[account_create_failed] ${
              e instanceof Error ? e.message.slice(0, 200) : "unknown"
            }`,
          });
        }

        // 11. Generate a one-shot magic link → client follows it → Supabase
        // sets the session cookie → redirect to /io/analisi/<leadId>.
        try {
          redirectUrl = await generateMagicLinkUrl({
            email: emailLower,
            next: `/io/analisi/${lead.id}`,
          });
        } catch (e) {
          console.error("[leadMagnet] generateMagicLinkUrl failed", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `[magiclink_failed] ${
              e instanceof Error ? e.message.slice(0, 200) : "unknown"
            }`,
          });
        }

        // 12. Track
        await trackEvent({
          userId: null,
          name: "lead_magnet_submitted",
          properties: {
            leadId: lead.id,
            handle,
            utm: input.utm,
            costCents: result.costCents,
            usedVision: result.usedVision,
          },
        }).catch(() => {});

        return { leadId: lead.id, redirectUrl };
      },
    ),

  /**
   * Second lead magnet: user describes a project idea as free-form text,
   * Claude (with web search) produces a critical reading + similar real
   * projects. No Instagram, no Vision, no image upload.
   *
   * Flow mirrors `analyze`, minus scraping and image handling:
   *   1. Turnstile
   *   2. Rate limit IP
   *   3. Reject if email already has a Ulilearn account
   *   4. Monthly limit for this source
   *   5. Soft daily email limit
   *   6. Insert lead row (source=lead_magnet_project)
   *   7. Check weekly budget
   *   8. Call Claude + web_search (1 retry on invalid JSON)
   *   9. Save analysis + budget accounting
   *   10. Create passwordless user + magic link
   *   11. Track
   */
  analyzeProject: publicProcedure
    .input(analyzeProjectInput)
    .mutation(
      async ({ ctx, input }): Promise<{ leadId: string; redirectUrl: string }> => {
        const headers = new Headers();
        const ip = getClientIp(headers);
        const emailLower = input.email.toLowerCase();

        const tsOk = await verifyTurnstile(input.turnstileToken, ip);
        if (!tsOk) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Verifica di sicurezza fallita. Ricarica la pagina e riprova.",
          });
        }

        const ipKey = hashIp(ip) ?? "anon";
        const ipRl = await leadMagnetProjectIpLimiter.limit(ipKey);
        if (!ipRl.success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Hai già richiesto un'analisi di recente. Riprova tra qualche minuto.",
          });
        }

        const existingUser = await ctx.db.user.findUnique({
          where: { email: emailLower },
          select: { id: true },
        });
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "[email_exists] Esiste già un account con questa email. Accedi per vedere la tua analisi.",
          });
        }

        await checkMonthlyLimit(ctx.db, emailLower, "lead_magnet_project");

        const emailRl = await leadMagnetProjectEmailLimiter.limit(emailLower);
        if (!emailRl.success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Hai già richiesto più analisi oggi con questa email.",
          });
        }

        const lead = await ctx.db.lead.create({
          data: {
            email: emailLower,
            source: "lead_magnet_project",
            projectBrief: input.projectBrief,
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

        const spent = await getWeeklySpendCents();
        if (spent > (env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000)) {
          await ctx.db.lead.update({
            where: { id: lead.id },
            data: { analysisError: "weekly_budget_exceeded" },
          });
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Stiamo ricevendo molte richieste questa settimana. Riprova tra qualche giorno.",
          });
        }

        let result;
        try {
          result = await analyzeProjectBrief({
            email: input.email,
            projectBrief: input.projectBrief,
          });
        } catch (e) {
          if (e instanceof ProjectAnalysisError && e.code === "invalid_output") {
            try {
              result = await analyzeProjectBrief({
                email: input.email,
                projectBrief: input.projectBrief,
              });
            } catch (e2) {
              console.error("[leadMagnet:project] Claude retry failed", e2);
              await ctx.db.lead.update({
                where: { id: lead.id },
                data: {
                  analysisError:
                    e2 instanceof Error ? e2.message.slice(0, 500) : "retry failed",
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
            console.error("[leadMagnet:project] Claude call failed", e);
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

        try {
          await createPasswordlessUser({
            email: emailLower,
            fullName: null,
            createdVia: "lead_magnet",
          });
        } catch (e) {
          console.error("[leadMagnet:project] createPasswordlessUser failed", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `[account_create_failed] ${
              e instanceof Error ? e.message.slice(0, 200) : "unknown"
            }`,
          });
        }

        let redirectUrl: string;
        try {
          redirectUrl = await generateMagicLinkUrl({
            email: emailLower,
            next: `/io/analisi/${lead.id}`,
          });
        } catch (e) {
          console.error("[leadMagnet:project] generateMagicLinkUrl failed", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `[magiclink_failed] ${
              e instanceof Error ? e.message.slice(0, 200) : "unknown"
            }`,
          });
        }

        await trackEvent({
          userId: null,
          name: "lead_magnet_project_analyzed",
          properties: {
            leadId: lead.id,
            utm: input.utm,
            costCents: result.costCents,
            webSearches: result.webSearches,
          },
        }).catch(() => {});

        return { leadId: lead.id, redirectUrl };
      },
    ),

  /**
   * Authenticated variant of `analyze`. Run from inside the dashboard:
   * the user is already logged in, so no Turnstile, no magic link, no
   * passwordless account creation. The lead is attached to the current
   * user immediately (status=analyzed, convertedUserId set).
   *
   * The public `analyze` remains for acquisition flows (external traffic
   * that doesn't yet have an account).
   */
  analyzeAuthed: protectedProcedure
    .input(
      z.object({
        instagramUrl: z
          .string()
          .trim()
          .regex(
            /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?(\?.*)?$/,
            {
              message:
                "Inserisci un URL Instagram valido, es. https://www.instagram.com/tuo_handle",
            },
          ),
      }),
    )
    .mutation(
      async ({ ctx, input }): Promise<{ leadId: string }> => {
        const userEmail = ctx.user.email;
        if (!userEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Il tuo account non ha un'email associata.",
          });
        }
        const emailLower = userEmail.toLowerCase();

        await checkMonthlyLimit(ctx.db, emailLower, "lead_magnet_ig");

        const spent = await getWeeklySpendCents();
        if (spent > (env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Stiamo ricevendo molte richieste questa settimana. Riprova tra qualche giorno.",
          });
        }

        const handle = extractInstagramHandle(input.instagramUrl);
        const lead = await ctx.db.lead.create({
          data: {
            email: emailLower,
            instagramUrl: input.instagramUrl,
            instagramHandle: handle,
            source: "lead_magnet_ig",
            marketingConsent: false,
            convertedUserId: ctx.user.id,
            convertedAt: new Date(),
            turnstileVerified: true,
          },
          select: { id: true },
        });

        let scraped: ScrapedInstagramProfile | null = null;
        if (handle) {
          try {
            scraped = await scrapeInstagramProfile(handle);
          } catch (e) {
            if (e instanceof ApifyScrapeError) {
              console.warn(
                `[leadMagnet:authed] scrape fallback (${e.code}): ${e.message}`,
              );
            } else {
              console.warn("[leadMagnet:authed] scrape unknown error", e);
            }
            scraped = null;
          }
        }

        let downloadedImages: DownloadedImages | undefined;
        if (scraped && scraped.latestPosts.length > 0) {
          downloadedImages = await downloadInstagramImages(scraped.latestPosts);
        }

        let result;
        try {
          result = await analyzeInstagramProfile({
            email: emailLower,
            instagramUrl: input.instagramUrl,
            instagramHandle: handle,
            scraped,
            preloadedImages: downloadedImages,
          });
        } catch (e) {
          if (e instanceof LeadAnalysisError && e.code === "invalid_output") {
            try {
              result = await analyzeInstagramProfile({
                email: emailLower,
                instagramUrl: input.instagramUrl,
                instagramHandle: handle,
                scraped,
                preloadedImages: downloadedImages,
              });
            } catch (e2) {
              console.error("[leadMagnet:authed] Claude retry failed", e2);
              await ctx.db.lead.update({
                where: { id: lead.id },
                data: {
                  analysisError:
                    e2 instanceof Error ? e2.message.slice(0, 500) : "retry failed",
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
            console.error("[leadMagnet:authed] Claude call failed", e);
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

        const uploadPromise = downloadedImages
          ? uploadLeadImages({ leadId: lead.id, images: downloadedImages })
          : Promise.resolve<Array<string | null>>([]);

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

        try {
          const uploaded = await uploadPromise;
          const publicUrls = uploaded.filter((u): u is string => !!u);
          if (publicUrls.length > 0) {
            await ctx.db.lead.update({
              where: { id: lead.id },
              data: { scrapedImages: publicUrls },
            });
          }
        } catch (e) {
          console.warn(
            "[leadMagnet:authed] image upload/save failed",
            e instanceof Error ? e.message : e,
          );
        }

        await trackEvent({
          userId: ctx.user.id,
          name: "lead_magnet_submitted",
          properties: {
            leadId: lead.id,
            handle,
            costCents: result.costCents,
            usedVision: result.usedVision,
            authed: true,
          },
        }).catch(() => {});

        return { leadId: lead.id };
      },
    ),

  /**
   * Authenticated variant of `analyzeProject`. Same contract as
   * `analyzeAuthed` but for the project-brief lead magnet.
   */
  analyzeProjectAuthed: protectedProcedure
    .input(
      z.object({
        projectBrief: z.string().trim().min(120).max(4000),
      }),
    )
    .mutation(
      async ({ ctx, input }): Promise<{ leadId: string }> => {
        const userEmail = ctx.user.email;
        if (!userEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Il tuo account non ha un'email associata.",
          });
        }
        const emailLower = userEmail.toLowerCase();

        await checkMonthlyLimit(ctx.db, emailLower, "lead_magnet_project");

        const spent = await getWeeklySpendCents();
        if (spent > (env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Stiamo ricevendo molte richieste questa settimana. Riprova tra qualche giorno.",
          });
        }

        const lead = await ctx.db.lead.create({
          data: {
            email: emailLower,
            source: "lead_magnet_project",
            projectBrief: input.projectBrief,
            marketingConsent: false,
            convertedUserId: ctx.user.id,
            convertedAt: new Date(),
            turnstileVerified: true,
          },
          select: { id: true },
        });

        let result;
        try {
          result = await analyzeProjectBrief({
            email: emailLower,
            projectBrief: input.projectBrief,
          });
        } catch (e) {
          if (e instanceof ProjectAnalysisError && e.code === "invalid_output") {
            try {
              result = await analyzeProjectBrief({
                email: emailLower,
                projectBrief: input.projectBrief,
              });
            } catch (e2) {
              console.error("[leadMagnet:project:authed] Claude retry failed", e2);
              await ctx.db.lead.update({
                where: { id: lead.id },
                data: {
                  analysisError:
                    e2 instanceof Error ? e2.message.slice(0, 500) : "retry failed",
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
            console.error("[leadMagnet:project:authed] Claude call failed", e);
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

        await trackEvent({
          userId: ctx.user.id,
          name: "lead_magnet_project_analyzed",
          properties: {
            leadId: lead.id,
            costCents: result.costCents,
            webSearches: result.webSearches,
            authed: true,
          },
        }).catch(() => {});

        return { leadId: lead.id };
      },
    ),

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
        source: z.enum(["lead_magnet_ig", "lead_magnet_project"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const leads = await ctx.db.lead.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.source ? { source: input.source } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        select: {
          id: true,
          email: true,
          instagramHandle: true,
          instagramUrl: true,
          source: true,
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
