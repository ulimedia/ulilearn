"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { ROUTES } from "@/lib/constants";
import { formatCurrencyEUR, formatDateIT } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const INTERVAL_LABEL = { year: "Annuale", month: "Mensile" } as const;

export function PlanListClient() {
  const query = trpc.plan.list.useQuery();
  const archive = trpc.plan.archive.useMutation({
    onSuccess: () => {
      toast.success("Piano archiviato");
      query.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const setActive = trpc.plan.setActive.useMutation({
    onSuccess: ({ syncWarning }) => {
      if (syncWarning) toast.error(`Salvato, ma: ${syncWarning}`);
      else toast.success("Aggiornato");
      query.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="overflow-x-auto border border-paper-300/10">
      <table className="w-full text-sm">
        <thead className="bg-ink-800 text-xs uppercase tracking-wider text-paper-400">
          <tr>
            <th className="px-4 py-3 text-left">Nome</th>
            <th className="px-4 py-3 text-left">Prezzo</th>
            <th className="px-4 py-3 text-left">Intervallo</th>
            <th className="px-4 py-3 text-left">Sconto Plus</th>
            <th className="px-4 py-3 text-left">Stripe</th>
            <th className="px-4 py-3 text-left">Stato</th>
            <th className="px-4 py-3 text-left">Aggiornato</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {query.isPending && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-paper-400">
                Caricamento…
              </td>
            </tr>
          )}
          {query.data?.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-paper-400">
                Nessun piano. Creane uno dal pulsante in alto.
              </td>
            </tr>
          )}
          {query.data?.map((p) => (
            <tr key={p.id} className="border-t border-paper-300/10 align-top">
              <td className="px-4 py-3">
                <Link
                  href={ROUTES.admin.planEdit(p.id)}
                  className="font-display text-base text-paper-50 hover:text-accent"
                >
                  {p.name}
                </Link>
                <p className="mt-0.5 text-xs text-paper-500">/{p.slug}</p>
              </td>
              <td className="px-4 py-3">{formatCurrencyEUR(p.priceCents)}</td>
              <td className="px-4 py-3">{INTERVAL_LABEL[p.billingInterval]}</td>
              <td className="px-4 py-3">{p.subscriberDiscountPercent}%</td>
              <td className="px-4 py-3 text-xs">
                {p.stripePriceId ? (
                  <span className="text-paper-300" title={p.stripePriceId}>
                    Sincronizzato
                  </span>
                ) : (
                  <span className="text-amber-400">Da sincronizzare</span>
                )}
              </td>
              <td className="px-4 py-3">
                {p.isActive ? (
                  <span className="bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                    Attivo
                  </span>
                ) : (
                  <span className="bg-paper-50/5 px-2 py-0.5 text-xs text-paper-400">
                    Archiviato
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-paper-400">
                {formatDateIT(p.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  {p.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={archive.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            `Archiviare “${p.name}”? Non sarà più offerto nuovo, ma gli abbonati attivi tengono il loro piano.`,
                          )
                        ) {
                          archive.mutate({ id: p.id });
                        }
                      }}
                    >
                      Archivia
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={setActive.isPending}
                      onClick={() =>
                        setActive.mutate({ id: p.id, isActive: true })
                      }
                    >
                      Riattiva
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
