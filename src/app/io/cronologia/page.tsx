import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Cronologia" };

export default function HistoryPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Cronologia visione</h1>
      <div className="mt-8">
        <EmptyState
          title="Ancora nessuna visione"
          description="Quando inizierai a guardare, i contenuti appariranno qui."
        />
      </div>
    </section>
  );
}
