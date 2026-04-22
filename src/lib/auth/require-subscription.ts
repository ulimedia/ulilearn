import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireUser } from "./require-user";
import { ROUTES } from "@/lib/constants";

/**
 * Server-side guard for pages that require an active subscription.
 * Redirects non-subscribers to /abbonati.
 */
export async function requireSubscription(nextPath?: string) {
  const { authUser, profile } = await requireUser(nextPath);

  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId: profile.id,
      status: { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: new Date() },
    },
    select: { id: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
  });

  if (!activeSub) {
    redirect(ROUTES.subscribe);
  }

  return { authUser, profile, subscription: activeSub };
}
