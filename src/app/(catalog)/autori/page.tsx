import type { Metadata } from "next";
import { getApi } from "@/server/trpc/server";
import { AuthorCard } from "@/components/catalog/AuthorCard";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Autori",
  description:
    "Gli autori che insegnano e raccontano dentro Ulilearn. Fotografe e fotografi contemporanei.",
};

export const revalidate = 600;

export default async function AutoriPage() {
  const api = await getApi();
  const authors = await api.author.publicList();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-accent">Catalogo</p>
      <h1 className="mt-3 font-display text-display-lg">Autori</h1>
      <p className="mt-4 max-w-2xl text-paper-300">
        Le persone che insegnano e raccontano dentro Ulilearn.
      </p>
      <div className="mt-12">
        {authors.length === 0 ? (
          <EmptyState
            title="Stiamo costruendo l'elenco autori"
            description="Torna presto."
          />
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {authors.map((a) => (
              <AuthorCard key={a.id} author={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
