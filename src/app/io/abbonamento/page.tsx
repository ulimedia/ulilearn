import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/auth/require-user";
import { getApi } from "@/server/trpc/server";
import { formatCurrencyEUR, formatDateIT } from "@/lib/utils";
import { ManageBillingButton } from "./ManageBillingButton";

export const metadata: Metadata = { title: "Il mio abbonamento" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  trialing: "In prova",
  active: "Attivo",
  past_due: "Pagamento in sospeso",
  canceled: "Annullato",
  expired: "Scaduto",
} as const;

const PAYMENT_STATUS_LABEL = {
  succeeded: "Pagato",
  refunded: "Rimborsato",
  failed: "Fallito",
  pending: "In sospeso",
} as const;

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams?: { welcome?: string };
}) {
  await requireUser(ROUTES.account.subscription);
  const api = await getApi();
  const status = await api.subscription.myStatus();
  const payments = await api.subscription.myPayments();

  return (
    <section>
      <h1 className="font-display text-3xl">Il mio abbonamento</h1>

      {searchParams?.welcome && status.active && (
        <p className="mt-6 border border-accent/40 bg-accent/5 p-4 text-sm text-accent">
          Benvenuto tra gli abbonati Ulilearn Plus. Puoi iniziare a guardare i
          contenuti dal{" "}
          <Link href={ROUTES.catalog} className="underline">
            catalogo
          </Link>
          .
        </p>
      )}

      {status.active ? (
        <div className="mt-8 space-y-6">
          <div className="border border-paper-300/15 p-6">
            <p className="text-xs uppercase tracking-wide text-paper-400">
              Piano attivo
            </p>
            <p className="mt-2 font-display text-2xl">{status.planName}</p>
            <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-paper-400">Stato</dt>
                <dd>{STATUS_LABEL[status.status]}</dd>
              </div>
              <div>
                <dt className="text-paper-400">
                  {status.cancelAtPeriodEnd
                    ? "Accesso fino al"
                    : "Prossimo rinnovo"}
                </dt>
                <dd>{formatDateIT(status.currentPeriodEnd)}</dd>
              </div>
              {status.cancelAtPeriodEnd && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-amber-300">
                    Hai disdetto: l&apos;accesso resterà attivo fino alla data
                    sopra, dopo non ci saranno più addebiti.
                  </p>
                </div>
              )}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <ManageBillingButton />
              <Link
                href={ROUTES.catalog}
                className="inline-flex h-11 items-center justify-center border border-paper-300/30 px-5 text-sm hover:bg-paper-50/5"
              >
                Vai al catalogo
              </Link>
            </div>
          </div>

          {payments.length > 0 && (
            <div>
              <h2 className="font-display text-xl">Storico pagamenti</h2>
              <div className="mt-4 overflow-x-auto border border-paper-300/10">
                <table className="w-full text-sm">
                  <thead className="bg-ink-800 text-xs uppercase tracking-wider text-paper-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Importo</th>
                      <th className="px-4 py-3 text-left">Stato</th>
                      <th className="px-4 py-3 text-left">Fattura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-paper-300/10"
                      >
                        <td className="px-4 py-3 text-paper-300">
                          {formatDateIT(p.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrencyEUR(p.amountCents)}
                        </td>
                        <td className="px-4 py-3">
                          {PAYMENT_STATUS_LABEL[p.status]}
                        </td>
                        <td className="px-4 py-3">
                          {p.invoiceUrl ? (
                            <a
                              href={p.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent underline-offset-4 hover:underline"
                            >
                              Apri ricevuta
                            </a>
                          ) : (
                            <span className="text-paper-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 border border-paper-300/15 p-6">
          <p className="font-display text-2xl">Non sei ancora abbonato</p>
          <p className="mt-3 text-paper-300">
            Con Ulilearn Plus accedi a tutto il catalogo on-demand.
          </p>
          <Link
            href={ROUTES.subscribe}
            className="mt-6 inline-flex h-12 items-center justify-center bg-accent px-6 text-base font-medium text-accent-foreground hover:bg-accent/90"
          >
            Scopri Plus
          </Link>
        </div>
      )}
    </section>
  );
}
