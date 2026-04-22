import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Salvati" };

export default function SavedPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Salvati</h1>
      <div className="mt-8">
        <EmptyState
          title="Nessun contenuto salvato"
          description="I contenuti che salverai dal catalogo compariranno qui."
        />
      </div>
    </section>
  );
}
