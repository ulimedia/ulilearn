import type { Metadata } from "next";

export const metadata: Metadata = { title: "Piani", robots: { index: false } };

export default function AdminPlansPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Piani</h1>
      <p className="mt-4 text-paper-300">CRUD piani + sync Stripe — Sprint 4.</p>
    </section>
  );
}
