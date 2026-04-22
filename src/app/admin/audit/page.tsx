import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };

export default function AdminAuditPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Audit log</h1>
      <p className="mt-4 text-paper-300">Lista azioni admin — Sprint 7.</p>
    </section>
  );
}
