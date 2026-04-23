import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/server/db/client";
import { formatDateIT } from "@/lib/utils";

export const metadata: Metadata = { title: "Nuova analisi" };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AnalizzaHubPage() {
  const { profile } = await requireUser();

  // Monthly availability per lead magnet source.
  const recent = await prisma.lead.findMany({
    where: {
      convertedUserId: profile.id,
      status: { in: ["analyzed", "emailed", "converted"] },
    },
    orderBy: { createdAt: "desc" },
    select: { source: true, createdAt: true },
  });

  const lastIg = recent.find((r) => r.source === "lead_magnet_ig");
  const lastProject = recent.find((r) => r.source === "lead_magnet_project");
  const igAvailable =
    !lastIg || Date.now() - lastIg.createdAt.getTime() >= THIRTY_DAYS_MS;
  const projectAvailable =
    !lastProject ||
    Date.now() - lastProject.createdAt.getTime() >= THIRTY_DAYS_MS;

  return (
    <section>
      <h1 className="font-display text-3xl">Nuova analisi</h1>
      <p className="mt-2 text-sm text-paper-300">
        Scegli il tipo di analisi. Puoi farne una al mese per tipologia.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          href="/io/analizza/profilo"
          title="Profilo Instagram"
          description="Analizziamo le tue ultime foto pubbliche e suggeriamo autori che risuonano con il tuo sguardo."
          available={igAvailable}
          nextAvailable={
            lastIg ? new Date(lastIg.createdAt.getTime() + THIRTY_DAYS_MS) : null
          }
          ctaLabel="Inizia dal profilo IG"
        />
        <Card
          href="/io/analizza/progetto"
          title="Idea di progetto"
          description="Racconta un'idea di progetto fotografico: ti restituiamo una lettura critica e progetti reali simili."
          available={projectAvailable}
          nextAvailable={
            lastProject
              ? new Date(lastProject.createdAt.getTime() + THIRTY_DAYS_MS)
              : null
          }
          ctaLabel="Racconta la tua idea"
        />
      </div>
    </section>
  );
}

function Card({
  href,
  title,
  description,
  available,
  nextAvailable,
  ctaLabel,
}: {
  href: string;
  title: string;
  description: string;
  available: boolean;
  nextAvailable: Date | null;
  ctaLabel: string;
}) {
  if (!available) {
    return (
      <div className="border border-paper-300/10 p-6 opacity-60">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="mt-3 text-sm text-paper-300">{description}</p>
        <p className="mt-6 text-xs text-paper-400">
          Prossima disponibile il{" "}
          {nextAvailable ? formatDateIT(nextAvailable) : ""}
        </p>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="group flex flex-col border border-paper-300/10 p-6 transition-colors duration-250 ease-soft hover:border-accent/60 hover:bg-accent/5"
    >
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-3 flex-1 text-sm text-paper-300">{description}</p>
      <span className="mt-6 text-sm font-semibold text-accent">
        {ctaLabel} →
      </span>
    </Link>
  );
}
