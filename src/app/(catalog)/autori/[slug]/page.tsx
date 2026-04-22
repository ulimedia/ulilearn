import type { Metadata } from "next";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: params.slug };
}

export default function AuthorPage({ params }: { params: { slug: string } }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-lg">{params.slug}</h1>
      <p className="mt-6 text-paper-300">
        Bio, portrait, elenco contenuti — Sprint 3 (PRD §6.2 #4).
      </p>
    </section>
  );
}
