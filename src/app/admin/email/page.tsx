import type { Metadata } from "next";

export const metadata: Metadata = { title: "Email", robots: { index: false } };

export default function AdminEmailPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Email</h1>
      <p className="mt-4 text-paper-300">Template + log invii — Sprint 7 (PRD §6.9).</p>
    </section>
  );
}
