import type { Metadata } from "next";
import { getApi } from "@/server/trpc/server";
import { ContentCard } from "@/components/catalog/ContentCard";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "./SearchBox";

export const metadata: Metadata = {
  title: "Ricerca",
  robots: { index: false },
};

export default async function RicercaPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const api = await getApi();
  const results = q.length >= 2 ? await api.content.publicSearch({ q }) : [];

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-lg">Ricerca</h1>
      <div className="mt-6">
        <SearchBox initial={q} />
      </div>
      <div className="mt-12">
        {q.length < 2 ? (
          <p className="text-paper-400">Inserisci almeno 2 caratteri.</p>
        ) : results.length === 0 ? (
          <EmptyState
            title="Nessun risultato"
            description={`Nulla per "${q}". Prova con un termine diverso o sfoglia il catalogo.`}
          />
        ) : (
          <>
            <p className="text-sm text-paper-400">
              {results.length} risultat{results.length === 1 ? "o" : "i"} per &ldquo;{q}&rdquo;
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {results.map((c) => (
                <ContentCard key={c.id} content={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
