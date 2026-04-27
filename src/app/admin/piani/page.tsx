import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlanListClient } from "./PlanListClient";

export const metadata: Metadata = { title: "Piani", robots: { index: false } };

export default function AdminPlansPage() {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Piani</h1>
        <Link
          href={ROUTES.admin.planNew}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Nuovo piano
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-paper-300">
        Crea e modifica i piani Plus. Al salvataggio sincronizziamo
        automaticamente Stripe (Product + Price). I prezzi su Stripe sono
        immutabili: cambiando il prezzo di un piano viene creato un nuovo Price
        e quello vecchio archiviato (gli abbonati esistenti tengono il loro).
      </p>
      <div className="mt-8">
        <PlanListClient />
      </div>
    </section>
  );
}
