import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogo",
  description: "Lecture, corsi e documentari Ulilearn.",
};

export default function CatalogHome() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-lg">Catalogo</h1>
      <p className="mt-4 max-w-2xl text-paper-300">
        L&apos;hero con i contenuti in evidenza, le righe &ldquo;Nuovi contenuti&rdquo;,
        &ldquo;Continua a guardare&rdquo;, e le sezioni per tipo saranno popolate negli sprint
        successivi (vedi PRD §6.2).
      </p>
    </section>
  );
}
