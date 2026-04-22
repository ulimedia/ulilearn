import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/server/db/client";
import { formatDateIT } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Le mie analisi" };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AnalisiListPage() {
  const { profile } = await requireUser();

  const analyses = await prisma.lead.findMany({
    where: {
      convertedUserId: profile.id,
      status: { in: ["analyzed", "emailed", "converted"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      instagramHandle: true,
      analysisJson: true,
    },
  });

  const mostRecent = analyses[0];
  const canDoNew =
    !mostRecent ||
    Date.now() - mostRecent.createdAt.getTime() >= THIRTY_DAYS_MS;
  const nextAvailable = mostRecent
    ? new Date(mostRecent.createdAt.getTime() + THIRTY_DAYS_MS)
    : null;

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Le mie analisi</h1>
          <p className="mt-2 text-sm text-paper-300">
            Puoi fare un&apos;analisi al mese. Il tuo sguardo cambia più lentamente
            dei tuoi feed.
          </p>
        </div>
        {canDoNew ? (
          <Link href={ROUTES.scopriAutori} className={cn(buttonVariants({ size: "sm" }))}>
            Nuova analisi
          </Link>
        ) : (
          <div className="text-right text-xs text-paper-400">
            Prossima disponibile
            <p className="mt-1 text-paper-300">
              {nextAvailable ? formatDateIT(nextAvailable) : ""}
            </p>
          </div>
        )}
      </div>

      {analyses.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nessuna analisi ancora"
            description="Fai la tua prima analisi del profilo Instagram."
            action={
              <Link
                href={ROUTES.scopriAutori}
                className={cn(buttonVariants({ size: "md" }))}
              >
                Inizia
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {analyses.map((a) => {
            const json = a.analysisJson as { headline?: string } | null;
            const headline = json?.headline ?? "La tua analisi";
            return (
              <li key={a.id} className="border border-paper-300/15">
                <Link
                  href={`/io/analisi/${a.id}`}
                  className="block p-5 transition-colors duration-250 ease-soft hover:bg-paper-50/5"
                >
                  <p className="text-xs uppercase tracking-wide text-paper-400">
                    {formatDateIT(a.createdAt)}
                    {a.instagramHandle && (
                      <span className="ml-3 text-paper-300">@{a.instagramHandle}</span>
                    )}
                  </p>
                  <p className="mt-2 font-display text-xl">{headline}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
