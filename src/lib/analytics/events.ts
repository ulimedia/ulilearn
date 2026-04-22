import { prisma } from "@/server/db/client";

export type AnalyticsEventName =
  | "signup_completed"
  | "checkout_started"
  | "checkout_completed"
  | "coupon_applied"
  | "content_viewed"
  | "content_completed"
  | "content_saved"
  | "subscription_canceled"
  | "subscription_reactivated"
  | "lead_magnet_submitted"
  | "lead_magnet_converted";

export async function trackEvent(params: {
  userId?: string | null;
  name: AnalyticsEventName;
  properties?: Record<string, unknown>;
}) {
  await prisma.analyticsEvent.create({
    data: {
      userId: params.userId ?? null,
      eventName: params.name,
      properties: (params.properties ?? {}) as object,
    },
  });
}
