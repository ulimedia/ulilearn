import type { Metadata } from "next";

export const metadata: Metadata = { title: "Corsi" };

export default function CorsiPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-lg">Corsi</h1>
      <p className="mt-4 text-paper-300">Griglia e filtri da popolare nello Sprint 3.</p>
    </section>
  );
}
