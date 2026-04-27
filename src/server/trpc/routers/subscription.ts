import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getStripeClient,
  isStripeConfigured,
} from "@/server/integrations/stripe/client";
import { getActiveSubscription } from "@/server/billing/subscription";
import { env } from "@/lib/env";
import { ROUTES } from "@/lib/constants";

function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export const subscriptionRouter = createTRPCRouter({
  /** Stato della subscription dell'utente loggato. */
  myStatus: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getActiveSubscription(ctx.user.id);
    if (!sub) return { active: false as const };
    return {
      active: true as const,
      planName: sub.plan.name,
      planSlug: sub.plan.slug,
      billingInterval: sub.plan.billingInterval,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      canceledAt: sub.canceledAt,
      stripeCustomerId: sub.stripeCustomerId,
    };
  }),

  /** Storico pagamenti (per tabella in /io/abbonamento). */
  myPayments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.payment.findMany({
      where: { userId: ctx.user.id, provider: "stripe" },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        invoiceUrl: true,
        createdAt: true,
      },
    });
  }),

  /** Crea Stripe Checkout Session in mode=subscription per il piano scelto. */
  createCheckout: protectedProcedure
    .input(z.object({ planId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe non è ancora configurato. Riprova più tardi.",
        });
      }

      const existing = await getActiveSubscription(ctx.user.id);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hai già un abbonamento attivo. Gestiscilo dal portale.",
        });
      }

      const plan = await ctx.db.plan.findUnique({
        where: { id: input.planId },
        select: {
          id: true,
          isActive: true,
          stripePriceId: true,
          name: true,
        },
      });
      if (!plan || !plan.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Piano non disponibile." });
      }
      if (!plan.stripePriceId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Piano non sincronizzato con Stripe. Contatta l'admin.",
        });
      }

      const stripe = getStripeClient();
      const userRow = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { email: true },
      });

      // Reuse stripe customer if any subscription history exists.
      const previousSub = await ctx.db.subscription.findFirst({
        where: { userId: ctx.user.id, stripeCustomerId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { stripeCustomerId: true },
      });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        ...(previousSub?.stripeCustomerId
          ? { customer: previousSub.stripeCustomerId }
          : {
              customer_email: userRow?.email ?? ctx.user.email ?? undefined,
            }),
        client_reference_id: ctx.user.id,
        metadata: {
          ulilearn_user_id: ctx.user.id,
          ulilearn_plan_id: plan.id,
        },
        subscription_data: {
          metadata: {
            ulilearn_user_id: ctx.user.id,
            ulilearn_plan_id: plan.id,
          },
        },
        success_url: `${appUrl()}${ROUTES.account.subscription}?welcome=1`,
        cancel_url: `${appUrl()}${ROUTES.subscribe}?canceled=1`,
        allow_promotion_codes: true,
        locale: "it",
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe non ha restituito un URL di checkout.",
        });
      }

      return { url: session.url };
    }),

  /** Crea una Stripe Customer Portal session per l'utente loggato. */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isStripeConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe non è ancora configurato.",
      });
    }
    const sub = await ctx.db.subscription.findFirst({
      where: { userId: ctx.user.id, stripeCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { stripeCustomerId: true },
    });
    if (!sub?.stripeCustomerId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nessun account di fatturazione associato a questo utente.",
      });
    }
    const stripe = getStripeClient();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl()}${ROUTES.account.subscription}`,
    });
    return { url: portal.url };
  }),
});
