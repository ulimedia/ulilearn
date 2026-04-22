import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lecture" };

export default function LecturePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-lg">Lecture</h1>
      <p className="mt-4 text-paper-300">Griglia e filtri da popolare nello Sprint 3.</p>
    </section>
  );
}
