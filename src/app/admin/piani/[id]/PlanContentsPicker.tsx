"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CONTENT_TYPE_LABELS, CONTENT_TYPES } from "@/lib/constants";
import type { ContentType } from "@prisma/client";

const ON_DEMAND_TYPES = ["lecture", "corso", "documentario"] as const satisfies readonly ContentType[];

export function PlanContentsPicker({ planId }: { planId: string }) {
  const utils = trpc.useUtils();
  const included = trpc.plan.getContents.useQuery({ planId });

  const [adderOpen, setAdderOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentType | "">("");

  // Pull a wide list and filter client-side to keep things simple.
  const candidates = trpc.content.list.useQuery(
    {
      limit: 100,
      search: search || undefined,
      type: typeFilter || undefined,
      status: "published",
    },
    { enabled: adderOpen },
  );

  const includedIds = useMemo(
    () => new Set((included.data ?? []).map((c) => c.id)),
    [included.data],
  );

  const addMutation = trpc.plan.addContent.useMutation({
    onSuccess: () => {
      utils.plan.getContents.invalidate({ planId });
      utils.plan.list.invalidate();
      utils.content.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.plan.removeContent.useMutation({
    onSuccess: () => {
      utils.plan.getContents.invalidate({ planId });
      utils.plan.list.invalidate();
      utils.content.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-paper-300">
            {included.isPending
              ? "Caricamento…"
              : `${included.data?.length ?? 0} contenuti inclusi`}
          </p>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setAdderOpen((v) => !v)}
          >
            {adderOpen ? "Chiudi" : "+ Aggiungi contenuti"}
          </Button>
        </div>

        {!included.isPending && (included.data?.length ?? 0) === 0 && (
          <p className="mt-4 border border-paper-300/15 p-4 text-sm text-paper-400">
            Nessun contenuto incluso. Premi &quot;+ Aggiungi contenuti&quot; per
            collegarne dal catalogo.
          </p>
        )}

        {(included.data?.length ?? 0) > 0 && (
          <ul className="mt-4 divide-y divide-paper-300/10 border border-paper-300/15">
            {included.data!.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                {c.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverImageUrl}
                    alt=""
                    className="h-10 w-16 flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="h-10 w-16 flex-shrink-0 bg-paper-300/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base">{c.title}</p>
                  <p className="truncate text-xs text-paper-400">
                    {CONTENT_TYPE_LABELS[c.type]}
                    {c.author?.fullName ? ` · ${c.author.fullName}` : ""} · /{c.slug}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() =>
                    removeMutation.mutate({ planId, contentItemId: c.id })
                  }
                >
                  Rimuovi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {adderOpen && (
        <div className="border border-paper-300/15 p-4">
          <p className="font-display text-lg">Aggiungi contenuti</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Input
              placeholder="Cerca per titolo o slug…"
              className="min-w-[220px] flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as ContentType | "")
              }
              className="max-w-[180px]"
            >
              <option value="">Tutti i tipi on-demand</option>
              {CONTENT_TYPES.filter((t) =>
                (ON_DEMAND_TYPES as readonly string[]).includes(t),
              ).map((t) => (
                <option key={t} value={t}>
                  {CONTENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-4">
            {candidates.isPending && (
              <p className="text-sm text-paper-400">Caricamento…</p>
            )}
            {candidates.data &&
              (() => {
                const visible = candidates.data.items.filter(
                  (c) =>
                    !includedIds.has(c.id) &&
                    (ON_DEMAND_TYPES as readonly string[]).includes(c.type),
                );
                if (visible.length === 0) {
                  return (
                    <p className="text-sm text-paper-400">
                      Nessun contenuto disponibile da aggiungere.
                    </p>
                  );
                }
                return (
                  <ul className="divide-y divide-paper-300/10 border border-paper-300/15">
                    {visible.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        {c.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.coverImageUrl}
                            alt=""
                            className="h-10 w-16 flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div className="h-10 w-16 flex-shrink-0 bg-paper-300/10" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base">
                            {c.title}
                          </p>
                          <p className="truncate text-xs text-paper-400">
                            {CONTENT_TYPE_LABELS[c.type]}
                            {c.author?.fullName ? ` · ${c.author.fullName}` : ""}
                            {" · /"}
                            {c.slug}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          disabled={addMutation.isPending}
                          onClick={() =>
                            addMutation.mutate({ planId, contentItemId: c.id })
                          }
                        >
                          Aggiungi
                        </Button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}
