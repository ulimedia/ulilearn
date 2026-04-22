import type { Metadata } from "next";
import { notFound } from "next/navigation";

const VALID_TIPI = ["lecture", "corso", "documentario"] as const;
type Tipo = (typeof VALID_TIPI)[number];

function isValidTipo(t: string): t is Tipo {
  return (VALID_TIPI as readonly string[]).includes(t);
}

export function generateMetadata({
  params,
}: {
  params: { tipo: string; slug: string };
}): Metadata {
  return { title: params.slug };
}

export default function ContentDetailPage({
  params,
}: {
  params: { tipo: string; slug: string };
}) {
  if (!isValidTipo(params.tipo)) notFound();
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-wide text-accent">{params.tipo}</p>
      <h1 className="mt-2 font-display text-display-lg">{params.slug}</h1>
      <p className="mt-6 text-paper-300">
        Cover, descrizione, autore, correlati, CTA &ldquo;Guarda ora&rdquo; /
        &ldquo;Abbonati&rdquo; — Sprint 3 (PRD §6.2 #3).
      </p>
    </section>
  );
}
