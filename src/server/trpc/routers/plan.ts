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
});

export const planRouter = createTRPCRouter({
  // Public: list active plans for /abbonati (with content count)
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
        _count: { select: { contents: true } },
      },
    });
  }),

  // Admin: list all plans (with content count)
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.plan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { contents: true } } },
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

      const data = {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        featureBullets: input.featureBullets,
        priceCents: input.priceCents,
        currency: input.currency,
        billingInterval: input.billingInterval,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      };

      const plan = input.id
        ? await ctx.db.plan.update({ where: { id: input.id }, data })
        : await ctx.db.plan.create({ data });

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

  /**
   * Returns the explicit list of contents included in this plan.
   * Used by the "Contenuti inclusi" picker in /admin/piani/[id].
   */
  getContents: adminProcedure
    .input(z.object({ planId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.planContent.findMany({
        where: { planId: input.planId },
        orderBy: { addedAt: "desc" },
        select: {
          contentItem: {
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              status: true,
              coverImageUrl: true,
              author: { select: { fullName: true } },
            },
          },
        },
      });
      return rows.map((r) => r.contentItem);
    }),

  /**
   * Replace the entire set of included contents in one shot.
   * Idempotent: deletes rows not in the new set, inserts the new ones.
   */
  setContents: adminProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        contentItemIds: z.array(z.string().uuid()).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findUnique({
        where: { id: input.planId },
        select: { id: true },
      });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await ctx.db.planContent.findMany({
        where: { planId: input.planId },
        select: { contentItemId: true },
      });
      const existingIds = new Set(existing.map((e) => e.contentItemId));
      const desiredIds = new Set(input.contentItemIds);

      const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));

      await ctx.db.$transaction([
        ...(toRemove.length > 0
          ? [
              ctx.db.planContent.deleteMany({
                where: {
                  planId: input.planId,
                  contentItemId: { in: toRemove },
                },
              }),
            ]
          : []),
        ...(toAdd.length > 0
          ? [
              ctx.db.planContent.createMany({
                data: toAdd.map((cid) => ({
                  planId: input.planId,
                  contentItemId: cid,
                })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);

      return { added: toAdd.length, removed: toRemove.length };
    }),

  /** Add one content to a plan (used by "+ Aggiungi" actions). */
  addContent: adminProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        contentItemId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.planContent.upsert({
        where: {
          planId_contentItemId: {
            planId: input.planId,
            contentItemId: input.contentItemId,
          },
        },
        create: input,
        update: {},
      });
      return { ok: true };
    }),

  /** Remove one content from a plan. */
  removeContent: adminProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        contentItemId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.planContent.deleteMany({ where: input });
      return { ok: true };
    }),
});
