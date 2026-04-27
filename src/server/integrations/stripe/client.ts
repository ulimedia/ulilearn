import Stripe from "stripe";
import { env } from "@/lib/env";

let cached: Stripe | null = null;

/**
 * Returns a singleton Stripe client. Lazy: build does not fail when
 * STRIPE_SECRET_KEY is missing — only the first call at runtime does.
 *
 * Use from server-side code only.
 */
export function getStripeClient(): Stripe {
  if (cached) return cached;
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Add it to your environment to use Stripe.",
    );
  }
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return cached;
}

/** True if Stripe credentials are present in the environment. */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}
