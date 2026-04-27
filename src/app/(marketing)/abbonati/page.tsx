import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { formatCurrencyEUR } from "@/lib/utils";
import { getApi } from "@/server/trpc/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckoutButton } from "./CheckoutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abbonati a Ulilearn Plus",
  description:
    "Tutto Ulilearn — lecture, corsi, documentari — con un solo abbonamento.",
};

const INTERVAL_LABEL: Record<"year" | "month", string> = {
  year: "/ anno",
  month: "/ mese",
};

export default async function SubscribePage({
  searchParams,
}: {
  searchParams?: { canceled?: string };
}) {
  const api = await getApi();
  const plans = await api.plan.publicList();

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-display-xl">Ulilearn Plus</h1>
      <p className="mt-6 max-w-2xl text-lg text-paper-300">
        Lecture, corsi e documentari, tutti inclusi. Una sola sottoscrizione,
        senza pop-up né rumore. Disdici quando vuoi dal tuo profilo.
      </p>

      {searchParams?.canceled && (
        <p className="mt-6 max-w-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          Hai annullato il pagamento. Quando vuoi puoi riprovare qui sotto.
        </p>
      )}

      {plans.length === 0 ? (
        <p className="mt-12 max-w-2xl border border-paper-300/15 p-8 text-paper-300">
          I piani saranno disponibili a breve. Torna tra qualche giorno.
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col border border-paper-300/20 p-8"
            >
              <p className="text-xs uppercase tracking-wide text-paper-400">
                {plan.billingInterval === "year" ? "Annuale" : "Mensile"}
              </p>
              <h2 className="mt-2 font-display text-3xl">{plan.name}</h2>
              {plan.description && (
                <p className="mt-2 text-sm text-paper-300">{plan.description}</p>
              )}
              <p className="mt-6 font-display text-5xl">
                {formatCurrencyEUR(plan.priceCents)}
                <span className="text-lg text-paper-300">
                  {" "}
                  {INTERVAL_LABEL[plan.billingInterval]}
                </span>
              </p>
              {plan.featureBullets.length > 0 && (
                <ul className="mt-6 space-y-2 text-sm text-paper-300">
                  {plan.featureBullets.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">·</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-8 flex-1" />

              {isAuthed ? (
                plan.stripePriceId ? (
                  <CheckoutButton planId={plan.id} planName={plan.name} />
                ) : (
                  <button
                    disabled
                    className="inline-flex h-12 items-center justify-center bg-paper-50/5 px-6 text-base text-paper-400"
                  >
                    In configurazione
                  </button>
                )
              ) : (
                <Link
                  href={`${ROUTES.signup}?next=${encodeURIComponent(ROUTES.subscribe)}`}
                  className="inline-flex h-12 items-center justify-center bg-accent px-6 text-base font-medium text-accent-foreground hover:bg-accent/90"
                >
                  Inizia ora
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
