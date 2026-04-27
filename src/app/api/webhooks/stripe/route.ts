import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { prisma } from "@/server/db/client";
import { getStripeClient } from "@/server/integrations/stripe/client";
import {
  handleCheckoutSessionCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpserted,
} from "@/server/integrations/stripe/webhook-handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook endpoint (PRD §6.4).
 *
 *  - Verifies signature against STRIPE_WEBHOOK_SECRET from the raw body.
 *  - Idempotent via public.stripe_events (event.id is unique).
 *  - Dispatches to handlers in webhook-handlers.ts.
 *
 * IMPORTANT: route reads the raw text body (not parsed JSON), and
 * middleware must NOT touch this path (see middleware.ts matcher).
 */
export async function POST(req: NextRequest) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid_signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Idempotency: if we already processed this event, ack and exit.
  const existing = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(prisma, event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpserted(prisma, event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(prisma, event);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(prisma, event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(prisma, event);
        break;
      default:
        // Unhandled event type — acknowledged silently.
        break;
    }

    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] handler error", event.id, event.type, err);
    // Don't record the event so Stripe will retry.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "handler_error" },
      { status: 500 },
    );
  }
}
