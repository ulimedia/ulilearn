import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ricerca", robots: { index: false } };

export default function RicercaPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-lg">Ricerca</h1>
      <p className="mt-4 text-paper-300">
        {searchParams.q ? `Query: "${searchParams.q}"` : "Digita per cercare."}
      </p>
    </section>
  );
}
