"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
  ROUTES,
} from "@/lib/constants";
import { formatCurrencyEUR, formatDateIT } from "@/lib/utils";
import type { ContentType, ContentStatus } from "@prisma/client";

export function ContentListClient() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ContentType | "">("");
  const [status, setStatus] = useState<ContentStatus | "">("");

  const query = trpc.content.list.useQuery({
    limit: 50,
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  const deleteContent = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success("Archiviato");
      query.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            placeholder="Cerca per titolo o slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as ContentType | "")}
          className="max-w-[180px]"
        >
          <option value="">Tutti i tipi</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CONTENT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as ContentStatus | "")}
          className="max-w-[180px]"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(CONTENT_STATUS_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto border border-paper-300/10">
        <table className="w-full text-sm">
          <thead className="bg-ink-800 text-xs uppercase tracking-wider text-paper-400">
            <tr>
              <th className="px-4 py-3 text-left">Titolo</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Stato</th>
              <th className="px-4 py-3 text-left">Autore</th>
              <th className="px-4 py-3 text-left">Prezzo</th>
              <th className="px-4 py-3 text-left">Aggiornato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {query.isPending && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-paper-400">
                  Caricamento…
                </td>
              </tr>
            )}
            {query.data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-paper-400">
                  Nessun contenuto. Inizia dal pulsante &ldquo;Nuovo contenuto&rdquo; in alto.
                </td>
              </tr>
            )}
            {query.data?.items.map((c) => (
              <tr key={c.id} className="border-t border-paper-300/10 align-top">
                <td className="px-4 py-3">
                  <Link
                    href={ROUTES.admin.contentEdit(c.id)}
                    className="font-display text-base text-paper-50 hover:text-accent"
                  >
                    {c.title}
                  </Link>
                  {c.subtitle && (
                    <p className="mt-0.5 text-xs text-paper-400">{c.subtitle}</p>
                  )}
                  <p className="mt-0.5 text-xs text-paper-500">/{c.slug}</p>
                </td>
                <td className="px-4 py-3">{CONTENT_TYPE_LABELS[c.type]}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">{c.author?.fullName ?? "—"}</td>
                <td className="px-4 py-3">
                  {c.isPurchasable && c.standalonePriceCents != null
                    ? formatCurrencyEUR(c.standalonePriceCents)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-paper-400">
                  {formatDateIT(c.updatedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.status !== "archived" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Archiviare questo contenuto?")) {
                          deleteContent.mutate({ id: c.id });
                        }
                      }}
                    >
                      Archivia
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const colors: Record<ContentStatus, string> = {
    draft: "bg-paper-400/20 text-paper-300",
    scheduled: "bg-blue-500/20 text-blue-200",
    published: "bg-green-500/20 text-green-200",
    archived: "bg-red-500/20 text-red-300",
  };
  return (
    <span className={`inline-block px-2 py-1 text-xs ${colors[status]}`}>
      {CONTENT_STATUS_LABELS[status]}
    </span>
  );
}
