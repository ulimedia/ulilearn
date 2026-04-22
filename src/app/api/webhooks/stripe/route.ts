import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. Full implementation in Sprint 4 (PRD §6.4 #4):
 *   - verify signature with STRIPE_WEBHOOK_SECRET
 *   - idempotency via public.stripe_events (event.id)
 *   - dispatch by event.type to handlers in
 *     src/server/integrations/stripe/webhooks/*
 *
 * IMPORTANT: this route reads the raw request body; do NOT pre-parse it
 * and do NOT let Next.js middleware touch it (see middleware matcher).
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Stripe webhook handler not yet implemented" },
    { status: 501 },
  );
}
