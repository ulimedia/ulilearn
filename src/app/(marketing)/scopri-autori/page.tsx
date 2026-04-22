import type { Metadata } from "next";
import { LeadMagnetFlow } from "./LeadMagnetFlow";

export const metadata: Metadata = {
  title: "Scopri gli autori che risuonano con il tuo sguardo",
  description:
    "Inserisci il tuo profilo Instagram e l'email: ti suggeriamo autori contemporanei e storici da esplorare. Un gesto curatoriale Ulilearn.",
  openGraph: {
    title: "Scopri gli autori che risuonano con il tuo sguardo — Ulilearn",
    description: "Un'analisi curatoriale del tuo sguardo e una selezione di autori.",
  },
  robots: { index: true, follow: true },
};

export default function ScopriAutoriPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-accent">Ulilearn · Lead magnet</p>
      <h1 className="mt-4 font-display text-display-xl">
        Scopri gli autori che risuonano con il tuo sguardo
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper-300">
        Inserisci il tuo profilo Instagram e la tua email. In meno di un minuto
        ti restituiamo un&apos;analisi curatoriale e una selezione di autori —
        contemporanei e storici — che potrebbero risuonare con te.
      </p>
      <p className="mt-4 text-sm text-paper-400">
        Non vediamo le tue foto. Lavoriamo per suggestioni, non per induzione.
      </p>

      <div className="mt-12">
        <LeadMagnetFlow />
      </div>

      <section className="mt-24 space-y-8">
        <h2 className="font-display text-2xl">Domande frequenti</h2>
        <Faq
          q="Quanto ci mette?"
          a="Tra i 15 e i 30 secondi. Ti mostriamo l'analisi a schermo e te la inviamo anche per email."
        />
        <Faq
          q="Cosa vedete del mio profilo?"
          a="Solo l'URL che inserisci. Non leggiamo le tue foto, non scorriamo i tuoi follower. L'analisi è una curatela — non una diagnosi — basata sul gesto di cercare autori che ti assomiglino."
        />
        <Faq
          q="Usate i miei dati?"
          a="L'email la usiamo per inviarti l'analisi e, se hai dato il consenso, occasionali suggerimenti editoriali. Puoi disiscriverti in un click. Non vendiamo dati a terzi, mai."
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
