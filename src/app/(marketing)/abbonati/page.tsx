import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Abbonati",
  description: "Un solo abbonamento annuale per accedere a tutto il catalogo Ulilearn.",
};

export default function SubscribePage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-xl">Ulilearn Plus</h1>
      <p className="mt-6 max-w-2xl text-lg text-paper-300">
        Un solo abbonamento annuale per accedere a tutte le lecture, corsi e
        documentari. Senza rinnovi complicati, senza pop-up, senza rumore.
      </p>

      <div className="mt-12 border border-paper-300/20 p-8">
        <p className="text-xs uppercase tracking-wide text-paper-400">Annuale</p>
        <p className="mt-2 font-display text-5xl">
          €— <span className="text-lg text-paper-300">/ anno</span>
        </p>
        <ul className="mt-6 space-y-2 text-sm text-paper-300">
          <li>Accesso completo al catalogo</li>
          <li>Nuovi contenuti durante l&apos;anno inclusi</li>
          <li>Disdici quando vuoi</li>
        </ul>
        <Link
          href={`${ROUTES.signup}?next=${encodeURIComponent(ROUTES.checkout)}`}
          className={cn(buttonVariants({ size: "lg" }), "mt-8")}
        >
          Inizia ora
        </Link>
      </div>
    </section>
  );
}
