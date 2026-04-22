"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/constants";

export function AuthorListClient() {
  const [search, setSearch] = useState("");
  const query = trpc.author.list.useQuery({ search: search || undefined });

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <Input
          placeholder="Cerca per nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto border border-paper-300/10">
        <table className="w-full text-sm">
          <thead className="bg-ink-800 text-xs uppercase tracking-wider text-paper-400">
            <tr>
              <th className="px-4 py-3 text-left">Autore</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Contenuti</th>
            </tr>
          </thead>
          <tbody>
            {query.isPending && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-paper-400">
                  Caricamento…
                </td>
              </tr>
            )}
            {query.data?.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-paper-400">
                  Nessun autore. Creane uno dal pulsante in alto.
                </td>
              </tr>
            )}
            {query.data?.items.map((a) => (
              <tr key={a.id} className="border-t border-paper-300/10">
                <td className="px-4 py-3">
                  <Link
                    href={ROUTES.admin.authorEdit(a.id)}
                    className="flex items-center gap-3 hover:text-accent"
                  >
                    {a.portraitUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.portraitUrl}
                        alt=""
                        className="h-10 w-10 object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-paper-300/10" />
                    )}
                    <span className="font-display text-base">{a.fullName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-paper-400">/{a.slug}</td>
                <td className="px-4 py-3">{a._count.contentItems}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
