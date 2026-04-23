import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/server/db/client";
import { formatDateIT } from "@/lib/utils";
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
      source: true,
      analysisJson: true,
    },
  });

  const lastOfSource = (src: "lead_magnet_ig" | "lead_magnet_project") =>
    analyses.find((a) => a.source === src);
  const lastIg = lastOfSource("lead_magnet_ig");
  const lastProject = lastOfSource("lead_magnet_project");
  const igAvailable =
    !lastIg || Date.now() - lastIg.createdAt.getTime() >= THIRTY_DAYS_MS;
  const projectAvailable =
    !lastProject ||
    Date.now() - lastProject.createdAt.getTime() >= THIRTY_DAYS_MS;

  return (
    <section>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl">Le mie analisi</h1>
          <p className="mt-2 text-sm text-paper-300">
            Puoi fare un&apos;analisi al mese per ciascun tipo. Il tuo sguardo
            cambia più lentamente dei tuoi feed.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <NewAnalysisButton
            href="/io/analizza/profilo"
            available={igAvailable}
            nextAvailable={
              lastIg ? new Date(lastIg.createdAt.getTime() + THIRTY_DAYS_MS) : null
            }
          >
            Analizza il profilo Instagram
          </NewAnalysisButton>
          <NewAnalysisButton
            href="/io/analizza/progetto"
            available={projectAvailable}
            nextAvailable={
              lastProject
                ? new Date(lastProject.createdAt.getTime() + THIRTY_DAYS_MS)
                : null
            }
          >
            Analizza un&apos;idea di progetto
          </NewAnalysisButton>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nessuna analisi ancora"
            description="Scegli il tipo di analisi da cui partire."
            action={
              <Link
                href="/io/analizza"
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
                  <p className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-paper-400">
                    <SourceBadge source={a.source} />
                    <span>{formatDateIT(a.createdAt)}</span>
                    {a.source === "lead_magnet_ig" && a.instagramHandle && (
                      <span className="text-paper-300">@{a.instagramHandle}</span>
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

function NewAnalysisButton({
  href,
  available,
  nextAvailable,
  children,
}: {
  href: string;
  available: boolean;
  nextAvailable: Date | null;
  children: React.ReactNode;
}) {
  if (available) {
    return (
      <Link
        href={href}
        className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
      >
        {children}
      </Link>
    );
  }
  return (
    <div className="border border-paper-300/15 px-4 py-2 text-xs text-paper-400">
      <p>{children}</p>
      <p className="mt-1 text-paper-300">
        Disponibile il {nextAvailable ? formatDateIT(nextAvailable) : ""}
      </p>
    </div>
  );
}

function SourceBadge({ source }: { source: "lead_magnet_ig" | "lead_magnet_project" }) {
  const label =
    source === "lead_magnet_project" ? "Progetto" : "Instagram";
  const colors =
    source === "lead_magnet_project"
      ? "bg-accent/20 text-accent"
      : "bg-paper-300/20 text-paper-200";
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] ${colors}`}>
      {label}
    </span>
  );
}
