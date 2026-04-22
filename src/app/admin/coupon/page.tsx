import type { Metadata } from "next";

export const metadata: Metadata = { title: "Coupon", robots: { index: false } };

export default function AdminCouponsPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Coupon</h1>
      <p className="mt-4 text-paper-300">CRUD coupon + sync Stripe — Sprint 4 (PRD §6.5).</p>
    </section>
  );
}
