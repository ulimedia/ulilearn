import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/server/db/client";
import { formatDateIT } from "@/lib/utils";
import { ProjectAuthedFlow } from "./ProjectAuthedFlow";

export const metadata: Metadata = { title: "Analizza l'idea del tuo progetto" };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AnalyzeProjectPage() {
  const { profile } = await requireUser();

  const lastProject = await prisma.lead.findFirst({
    where: {
      convertedUserId: profile.id,
      source: "lead_magnet_project",
      status: { in: ["analyzed", "emailed", "converted"] },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const available =
    !lastProject ||
    Date.now() - lastProject.createdAt.getTime() >= THIRTY_DAYS_MS;
  const nextAvailable = lastProject
    ? new Date(lastProject.createdAt.getTime() + THIRTY_DAYS_MS)
    : null;

  return (
    <section className="max-w-2xl">
      <Link
        href="/io/analizza"
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Torna indietro
      </Link>
      <h1 className="mt-6 font-display text-3xl">
        Analizza l&apos;idea del tuo progetto fotografico
      </h1>
      <p className="mt-3 text-sm text-paper-300">
        Raccontaci a parole un&apos;idea di progetto che vorresti realizzare.
        Ti restituiamo una lettura critica, punti di forza, rischi, prossimi
        passi e progetti fotografici reali simili. Fino a 90 secondi.
      </p>

      <div className="mt-8">
        {available ? (
          <ProjectAuthedFlow />
        ) : (
          <div className="border border-paper-300/15 p-6">
            <p className="text-sm text-paper-300">
              Hai già fatto un&apos;analisi progetto questo mese. Potrai
              rifarne una il{" "}
              <span className="text-paper-50">
                {nextAvailable ? formatDateIT(nextAvailable) : ""}
              </span>
              .
            </p>
            <Link
              href="/io/analisi"
              className="mt-4 inline-block text-sm text-accent hover:underline"
            >
              Vai alle tue analisi →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
