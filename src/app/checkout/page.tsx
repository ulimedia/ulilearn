import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  await requireUser("/checkout");
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl">Checkout</h1>
      <p className="mt-4 text-paper-300">
        Stripe Elements + PayPal button + campo coupon — Sprint 4 (PRD §6.4).
      </p>
    </section>
  );
}
