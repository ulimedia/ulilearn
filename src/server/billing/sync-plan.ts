import type { Plan, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { getStripeClient } from "@/server/integrations/stripe/client";

type PlanWritable = Pick<
  Plan,
  | "id"
  | "name"
  | "description"
  | "priceCents"
  | "currency"
  | "billingInterval"
  | "isActive"
  | "stripeProductId"
  | "stripePriceId"
>;

/**
 * Sync a Plan record with Stripe Products + Prices.
 *
 * Behavior:
 *  - Creates a Product the first time (one Product per Plan).
 *  - Updates Product name/description/active when those change.
 *  - Creates a Price the first time. Stripe Prices are immutable, so when
 *    priceCents/currency/interval change we deactivate the old Price and
 *    create a new one. Existing subscriptions keep their previous Price.
 *  - Toggles the active state on Stripe to mirror Plan.isActive.
 *
 * Returns the {stripeProductId, stripePriceId} to persist.
 */
export async function syncPlanWithStripe(
  db: PrismaClient,
  plan: PlanWritable,
): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const stripe = getStripeClient();
  const interval: Stripe.PriceCreateParams.Recurring.Interval =
    plan.billingInterval === "year" ? "year" : "month";

  let productId = plan.stripeProductId;
  if (!productId) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description ?? undefined,
      active: plan.isActive,
      metadata: { ulilearn_plan_id: plan.id },
    });
    productId = product.id;
  } else {
    await stripe.products.update(productId, {
      name: plan.name,
      description: plan.description ?? undefined,
      active: plan.isActive,
    });
  }

  let priceId = plan.stripePriceId;
  let needsNewPrice = !priceId;
  if (priceId) {
    try {
      const existing = await stripe.prices.retrieve(priceId);
      const sameAmount = existing.unit_amount === plan.priceCents;
      const sameCurrency =
        (existing.currency ?? "").toUpperCase() === plan.currency.toUpperCase();
      const sameInterval = existing.recurring?.interval === interval;
      if (!sameAmount || !sameCurrency || !sameInterval) {
        needsNewPrice = true;
        if (existing.active) {
          await stripe.prices.update(priceId, { active: false });
        }
      } else if (existing.active !== plan.isActive) {
        await stripe.prices.update(priceId, { active: plan.isActive });
      }
    } catch {
      // Price was deleted on Stripe side: recreate it.
      needsNewPrice = true;
    }
  }

  if (needsNewPrice) {
    const created = await stripe.prices.create({
      product: productId,
      currency: plan.currency.toLowerCase(),
      unit_amount: plan.priceCents,
      recurring: { interval },
      active: plan.isActive,
      metadata: { ulilearn_plan_id: plan.id },
    });
    priceId = created.id;
  }

  await db.plan.update({
    where: { id: plan.id },
    data: { stripeProductId: productId, stripePriceId: priceId! },
  });

  return { stripeProductId: productId, stripePriceId: priceId! };
}

/**
 * Archive a Plan on Stripe: deactivates Product + Price.
 * Existing subscriptions keep working until they cancel.
 */
export async function archivePlanOnStripe(plan: {
  stripeProductId: string | null;
  stripePriceId: string | null;
}): Promise<void> {
  const stripe = getStripeClient();
  if (plan.stripePriceId) {
    try {
      await stripe.prices.update(plan.stripePriceId, { active: false });
    } catch {
      // already gone — ignore
    }
  }
  if (plan.stripeProductId) {
    try {
      await stripe.products.update(plan.stripeProductId, { active: false });
    } catch {
      // already gone — ignore
    }
  }
}
