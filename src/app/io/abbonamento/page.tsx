import type { Metadata } from "next";

export const metadata: Metadata = { title: "Il mio abbonamento" };

export default function SubscriptionPage() {
  return (
    <section>
      <h1 className="font-display text-3xl">Il mio abbonamento</h1>
      <p className="mt-4 text-paper-300">
        Stato, prossimo rinnovo, metodo di pagamento, storico pagamenti, cancellazione
        — da implementare nello Sprint 6 (PRD §6.4 / §6.6).
      </p>
    </section>
  );
}
