import type { Metadata } from "next";
import { requireSubscription } from "@/lib/auth/require-subscription";

export const metadata: Metadata = { title: "Player", robots: { index: false } };

export default async function WatchPage({ params }: { params: { id: string } }) {
  await requireSubscription(`/watch/${params.id}`);
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl">Player</h1>
      <p className="mt-4 text-paper-300">
        Contenuto <code>{params.id}</code> — player Vimeo da implementare nello Sprint 5 (PRD §6.3).
      </p>
    </section>
  );
}
