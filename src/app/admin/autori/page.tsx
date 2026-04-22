import type { Metadata } from "next";

export const metadata: Metadata = { title: "Autori", robots: { index: false } };

export default function AdminAuthorsPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Autori</h1>
      <p className="mt-4 text-paper-300">CRUD autori — Sprint 2.</p>
    </section>
  );
}
