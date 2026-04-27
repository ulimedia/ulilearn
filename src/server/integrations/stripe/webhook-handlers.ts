import type Stripe from "stripe";
import type { PrismaClient, SubscriptionStatus } from "@prisma/client";
import { getStripeClient } from "./client";

/**
 * Map a Stripe subscription status to our local enum.
 * Anything we don't track explicitly maps to canceled/expired.
 */
function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
    case "incomplete_expired":
      return "expired";
    case "canceled":
    case "incomplete":
    case "paused":
      return "canceled";
    default:
      return "canceled";
  }
}

/**
 * Resolve our internal Plan.id from a Stripe subscription.
 * Tries (in order): subscription metadata, price ID lookup on plans table.
 */
async function resolvePlanId(
  db: PrismaClient,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const metaPlan = (sub.metadata?.ulilearn_plan_id ?? "").trim();
  if (metaPlan) {
    const found = await db.plan.findUnique({
      where: { id: metaPlan },
      select: { id: true },
    });
    if (found) return found.id;
  }
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId) {
    const byPrice = await db.plan.findFirst({
      where: { stripePriceId: priceId },
      select: { id: true },
    });
    if (byPrice) return byPrice.id;
  }
  return null;
}

/**
 * Resolve our user.id from a checkout session or subscription.
 * Order: client_reference_id → subscription metadata → email lookup → null.
 */
async function resolveUserId(
  db: PrismaClient,
  source: {
    clientReferenceId?: string | null;
    metadataUserId?: string | null;
    email?: string | null;
  },
): Promise<string | null> {
  if (source.clientReferenceId) {
    const u = await db.user.findUnique({
      where: { id: source.clientReferenceId },
      select: { id: true },
    });
    if (u) return u.id;
  }
  if (source.metadataUserId) {
    const u = await db.user.findUnique({
      where: { id: source.metadataUserId },
      select: { id: true },
    });
    if (u) return u.id;
  }
  if (source.email) {
    const u = await db.user.findUnique({
      where: { email: source.email },
      select: { id: true },
    });
    if (u) return u.id;
  }
  return null;
}

/**
 * Persist (insert or update) a Subscription row from a Stripe subscription.
 * Idempotent on stripe_subscription_id.
 */
async function upsertSubscription(
  db: PrismaClient,
  sub: Stripe.Subscription,
  fallbackUserId: string | null,
): Promise<void> {
  const userId =
    fallbackUserId ??
    (await resolveUserId(db, {
      metadataUserId: sub.metadata?.ulilearn_user_id,
      email:
        typeof sub.customer === "object" && sub.customer && "email" in sub.customer
          ? (sub.customer.email as string | null)
          : null,
    }));
  if (!userId) {
    console.warn("[stripe webhook] cannot resolve user for subscription", sub.id);
    return;
  }
  const planId = await resolvePlanId(db, sub);
  if (!planId) {
    console.warn("[stripe webhook] cannot resolve plan for subscription", sub.id);
    return;
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const data = {
    userId,
    planId,
    status: mapStatus(sub.status),
    stripeSubscriptionId: sub.id,
    stripeCustomerId: customerId,
    startedAt: new Date((sub.start_date ?? sub.created) * 1000),
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
  };

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: data,
    update: {
      status: data.status,
      stripeCustomerId: data.stripeCustomerId,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      canceledAt: data.canceledAt,
      planId: data.planId,
    },
  });
}

export async function handleCheckoutSessionCompleted(
  db: PrismaClient,
  event: Stripe.Event,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode !== "subscription" || !session.subscription) return;

  const stripe = getStripeClient();
  const sub = await stripe.subscriptions.retrieve(
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id,
  );
  const userId = await resolveUserId(db, {
    clientReferenceId: session.client_reference_id,
    metadataUserId: session.metadata?.ulilearn_user_id,
    email: session.customer_details?.email ?? session.customer_email,
  });
  await upsertSubscription(db, sub, userId);
}

export async function handleSubscriptionUpserted(
  db: PrismaClient,
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  await upsertSubscription(db, sub, null);
}

export async function handleSubscriptionDeleted(
  db: PrismaClient,
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
    select: { id: true },
  });
  if (!existing) {
    await upsertSubscription(db, sub, null);
    return;
  }
  await db.subscription.update({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: mapStatus(sub.status),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at
        ? new Date(sub.canceled_at * 1000)
        : new Date(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}

export async function handleInvoicePaid(
  db: PrismaClient,
  event: Stripe.Event,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  // Find the related Subscription by customer (most recent).
  const sub = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true },
  });
  if (!sub) return;

  await db.payment.upsert({
    where: {
      provider_providerPaymentId: {
        provider: "stripe",
        providerPaymentId: invoice.id ?? `invoice_${invoice.number ?? Date.now()}`,
      },
    },
    create: {
      userId: sub.userId,
      subscriptionId: sub.id,
      provider: "stripe",
      providerPaymentId: invoice.id!,
      amountCents: invoice.amount_paid ?? invoice.total ?? 0,
      currency: (invoice.currency ?? "EUR").toUpperCase(),
      status: "succeeded",
      invoiceUrl: invoice.hosted_invoice_url ?? null,
    },
    update: {
      amountCents: invoice.amount_paid ?? invoice.total ?? 0,
      status: "succeeded",
      invoiceUrl: invoice.hosted_invoice_url ?? null,
    },
  });

  // Refresh subscription period from Stripe (the subscription.updated event
  // is delivered separately too, but Stripe orders aren't guaranteed).
  const stripeSubId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (stripeSubId) {
    const stripe = getStripeClient();
    const liveSub = await stripe.subscriptions.retrieve(stripeSubId);
    await upsertSubscription(db, liveSub, sub.userId);
  }
}

export async function handleInvoicePaymentFailed(
  db: PrismaClient,
  event: Stripe.Event,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const sub = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true },
  });
  if (!sub) return;

  if (invoice.id) {
    await db.payment.upsert({
      where: {
        provider_providerPaymentId: {
          provider: "stripe",
          providerPaymentId: invoice.id,
        },
      },
      create: {
        userId: sub.userId,
        subscriptionId: sub.id,
        provider: "stripe",
        providerPaymentId: invoice.id,
        amountCents: invoice.amount_due ?? invoice.total ?? 0,
        currency: (invoice.currency ?? "EUR").toUpperCase(),
        status: "failed",
        invoiceUrl: invoice.hosted_invoice_url ?? null,
      },
      update: { status: "failed" },
    });
  }

  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "past_due" },
  });
}
