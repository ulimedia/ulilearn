import type { Metadata } from "next";

export const metadata: Metadata = { title: "Utenti", robots: { index: false } };

export default function AdminUsersPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Utenti</h1>
      <p className="mt-4 text-paper-300">CRM view, segmentazioni, rimborsi — Sprint 7 (PRD §6.8).</p>
    </section>
  );
}
