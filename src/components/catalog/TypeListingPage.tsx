import { getApi } from "@/server/trpc/server";
import { ContentGrid } from "./ContentGrid";
import { CONTENT_TYPE_PLURAL_LABELS } from "@/lib/constants";
import type { ContentType } from "@prisma/client";

const SUBTITLES: Record<ContentType, string> = {
  lecture:
    "Incontri di un'ora con autori contemporanei. Live, poi disponibili on-demand per tutti gli abbonati.",
  corso:
    "Percorsi strutturati in moduli e lezioni. Per chi vuole formarsi davvero, non solo guardare.",
  documentario:
    "Sguardi lunghi su autori e movimenti. Pensati per essere visti e rivisti.",
  masterclass:
    "Sessioni intensive con un singolo autore. Acquistabili singolarmente, gli abbonati hanno uno sconto fisso.",
  workshop:
    "Incontri in presenza, posti limitati. Acquistabili singolarmente, gli abbonati hanno uno sconto fisso.",
};

export async function TypeListingPage({ type }: { type: ContentType }) {
  const api = await getApi();
  const data = await api.content.publicByType({ type, limit: 36 });

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-accent">Catalogo</p>
      <h1 className="mt-3 font-display text-display-lg">
        {CONTENT_TYPE_PLURAL_LABELS[type]}
      </h1>
      <p className="mt-4 max-w-2xl text-paper-300">{SUBTITLES[type]}</p>
      <div className="mt-12">
        <ContentGrid
          items={data.items}
          emptyTitle={`Ancora nessun ${CONTENT_TYPE_PLURAL_LABELS[type].toLowerCase()}`}
          emptyDescription="Stiamo lavorando ai prossimi contenuti."
        />
      </div>
    </section>
  );
}
