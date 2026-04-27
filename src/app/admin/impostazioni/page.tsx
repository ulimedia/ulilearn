import type { Metadata } from "next";
import { getApi } from "@/server/trpc/server";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Impostazioni", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const api = await getApi();
  const settings = await api.settings.get();

  return (
    <section>
      <h1 className="font-display text-3xl">Impostazioni</h1>
      <p className="mt-2 max-w-2xl text-sm text-paper-300">
        Configurazioni globali del sito. Lo sconto qui sotto si applica al
        prezzo di masterclass e workshop quando li acquista un utente con un
        abbonamento Plus attivo, a meno che il singolo contenuto non abbia
        impostato un &ldquo;Prezzo personalizzato per abbonati&rdquo; che lo
        sovrascrive.
      </p>
      <div className="mt-8">
        <SettingsForm
          initial={{
            subscriberDiscountPercent: settings.subscriberDiscountPercent,
          }}
        />
      </div>
    </section>
  );
}
