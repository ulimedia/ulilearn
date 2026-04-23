import type { Metadata } from "next";
import { LeadMagnetProjectFlow } from "./LeadMagnetProjectFlow";

export const metadata: Metadata = {
  title: "Analizza l'idea del tuo progetto fotografico",
  description:
    "Raccontaci l'idea di un progetto fotografico che vorresti realizzare: ti restituiamo una lettura critica e progetti simili già realizzati da cui partire.",
  openGraph: {
    title:
      "Analizza l'idea del tuo progetto fotografico — Ulilearn",
    description:
      "Una lettura curatoriale della tua idea e una selezione di progetti reali che risuonano.",
  },
  robots: { index: true, follow: true },
};

export default function AnalizzaProgettoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-accent">
        Ulilearn · Lead magnet
      </p>
      <h1 className="mt-4 font-display text-display-xl">
        Analizza l&apos;idea del tuo progetto fotografico
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper-300">
        Raccontaci a parole un&apos;idea di progetto fotografico che vorresti
        realizzare. Ti restituiamo una lettura critica — direzione, punti di
        forza, rischi, prossimi passi — e una selezione di progetti fotografici
        reali che risuonano con la tua idea, verificati sul web.
      </p>
      <p className="mt-4 text-sm text-paper-400">
        L&apos;analisi può richiedere fino a un minuto e mezzo.
      </p>

      <div className="mt-12">
        <LeadMagnetProjectFlow />
      </div>

      <section className="mt-24 space-y-8">
        <h2 className="font-display text-2xl">Domande frequenti</h2>
        <Faq
          q="Serve un'idea già definita?"
          a="No. Anche un'intuizione confusa va bene, purché ci sia una direzione. Più precisa è la descrizione, più puntuale sarà la lettura."
        />
        <Faq
          q="Cosa trovo nell'analisi?"
          a="Una lettura editoriale in 2-4 paragrafi, i punti di forza, i rischi, un paio di passi pratici per iniziare, e 3-6 progetti fotografici reali — libri, serie, mostre — che hanno un punto di contatto con la tua idea. Ogni riferimento ha una fonte verificata."
        />
        <Faq
          q="Come trovate i progetti simili?"
          a="Il modello cerca davvero sul web, prima di rispondere. Non inventa titoli né date: se un riferimento non esiste o non lo ritrova, lo scarta."
        />
        <Faq
          q="Quanto ci mette?"
          a="Fino a un minuto e mezzo. Cercare prima di scrivere richiede tempo."
        />
        <Faq
          q="Usate i miei dati?"
          a="L'email la usiamo per ricontattarti, solo se hai dato il consenso. Il brief viene salvato insieme all'analisi nella tua area personale — non lo usiamo per altro."
        />
        <Faq
          q="Posso rifarla?"
          a="Una volta al mese. Un'idea matura più lentamente di quanto crediamo."
        />
        <Faq
          q="È gratis?"
          a="Sì. È un assaggio del lavoro curatoriale che facciamo dentro Ulilearn Plus."
        />
      </section>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="font-display text-lg">{q}</p>
      <p className="mt-2 text-paper-300">{a}</p>
    </div>
  );
}
