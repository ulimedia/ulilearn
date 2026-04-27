import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../init";
import { archivePlanOnStripe, syncPlanWithStripe } from "@/server/billing/sync-plan";
import { isStripeConfigured } from "@/server/integrations/stripe/client";

const planUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Solo lettere minuscole, numeri e trattini"),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  featureBullets: z.array(z.string().min(1).max(200)).max(20).default([]),
  priceCents: z.number().int().min(0).max(10_000_00),
  currency: z
    .string()
    .length(3)
    .default("EUR")
    .transform((v) => v.toUpperCase()),
  billingInterval: z.enum(["year", "month"]),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  subscriberDiscountPercent: z.number().int().min(0).max(100).default(20),
});

export const planRouter = createTRPCRouter({
  // Public: list active plans for /abbonati
  publicList: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        featureBullets: true,
        priceCents: true,
        currency: true,
        billingInterval: true,
        stripePriceId: true,
        subscriberDiscountPercent: true,
      },
    });
  }),

  // Admin
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.plan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findUnique({ where: { id: input.id } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
      return plan;
    }),

  upsert: adminProcedure
    .input(planUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      // Slug unicity: catch on client too via Zod, but enforce here.
      const slugClash = await ctx.db.plan.findFirst({
        where: { slug: input.slug, id: input.id ? { not: input.id } : undefined },
        select: { id: true },
      });
      if (slugClash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esiste già un piano con questo slug.",
        });
      }

      const plan = input.id
        ? await ctx.db.plan.update({
            where: { id: input.id },
            data: {
              slug: input.slug,
              name: input.name,
              description: input.description ?? null,
              featureBullets: input.featureBullets,
              priceCents: input.priceCents,
              currency: input.currency,
              billingInterval: input.billingInterval,
              sortOrder: input.sortOrder,
              isActive: input.isActive,
              subscriberDiscountPercent: input.subscriberDiscountPercent,
            },
          })
        : await ctx.db.plan.create({
            data: {
              slug: input.slug,
              name: input.name,
              description: input.description ?? null,
              featureBullets: input.featureBullets,
              priceCents: input.priceCents,
              currency: input.currency,
              billingInterval: input.billingInterval,
              sortOrder: input.sortOrder,
              isActive: input.isActive,
              subscriberDiscountPercent: input.subscriberDiscountPercent,
            },
          });

      let syncWarning: string | null = null;
      if (isStripeConfigured()) {
        try {
          await syncPlanWithStripe(ctx.db, plan);
        } catch (e) {
          syncWarning =
            e instanceof Error ? e.message : "Errore sconosciuto su Stripe";
        }
      } else {
        syncWarning =
          "Stripe non configurato: il piano è salvato in DB ma non sincronizzato.";
      }

      const fresh = await ctx.db.plan.findUniqueOrThrow({ where: { id: plan.id } });
      return { plan: fresh, syncWarning };
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
      let syncWarning: string | null = null;
      if (isStripeConfigured()) {
        try {
          await syncPlanWithStripe(ctx.db, plan);
        } catch (e) {
          syncWarning = e instanceof Error ? e.message : "Errore Stripe";
        }
      }
      return { ok: true, syncWarning };
    }),

  archive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findUnique({ where: { id: input.id } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
      const subsCount = await ctx.db.subscription.count({
        where: {
          planId: input.id,
          status: { in: ["trialing", "active", "past_due"] },
        },
      });
      if (subsCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Non puoi archiviare: ${subsCount} abbonamenti attivi su questo piano.`,
        });
      }
      await ctx.db.plan.update({
        where: { id: input.id },
        data: { isActive: false },
      });
      if (isStripeConfigured()) {
        try {
          await archivePlanOnStripe(plan);
        } catch {
          // already inactive on Stripe — ignore
        }
      }
      return { ok: true };
    }),
});
