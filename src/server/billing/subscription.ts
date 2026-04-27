import type { Subscription, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";

const ACTIVE_STATUSES: SubscriptionStatus[] = ["trialing", "active", "past_due"];

/**
 * Returns the user's most recent subscription that grants access.
 * "Active" here includes trialing, active and past_due — past_due users
 * keep access until Stripe finalizes the dunning outcome.
 */
export async function getActiveSubscription(
  userId: string,
): Promise<(Subscription & { plan: { name: string; slug: string; billingInterval: "year" | "month" } }) | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ACTIVE_STATUSES },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
    include: {
      plan: { select: { name: true, slug: true, billingInterval: true } },
    },
  });
  return sub;
}

/** Returns true if the user currently has access via an active Plus subscription. */
export async function userHasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getActiveSubscription(userId);
  return Boolean(sub);
}

/**
 * Returns the set of contentItem IDs accessible to the user via any of their
 * currently active subscriptions (i.e. the union of all PlanContent rows for
 * plans the user is subscribed to). Returns an empty Set if no active sub.
 */
export async function getUserAccessibleContentIds(
  userId: string,
): Promise<Set<string>> {
  const rows = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ACTIVE_STATUSES },
      currentPeriodEnd: { gt: new Date() },
    },
    select: {
      plan: {
        select: {
          contents: { select: { contentItemId: true } },
        },
      },
    },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    for (const c of row.plan.contents) ids.add(c.contentItemId);
  }
  return ids;
}
