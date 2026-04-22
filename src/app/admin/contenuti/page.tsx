import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contenuti", robots: { index: false } };

export default function AdminContentsPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Contenuti</h1>
      <p className="mt-4 text-paper-300">CRUD contenuti, editor, drag&drop moduli — Sprint 2.</p>
    </section>
  );
}
