import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/server/db/client";
import { formatDateIT } from "@/lib/utils";
import { ProfileAuthedFlow } from "./ProfileAuthedFlow";

export const metadata: Metadata = { title: "Analizza il tuo profilo Instagram" };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AnalyzeProfilePage() {
  const { profile } = await requireUser();

  const lastIg = await prisma.lead.findFirst({
    where: {
      convertedUserId: profile.id,
      source: "lead_magnet_ig",
      status: { in: ["analyzed", "emailed", "converted"] },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const available =
    !lastIg || Date.now() - lastIg.createdAt.getTime() >= THIRTY_DAYS_MS;
  const nextAvailable = lastIg
    ? new Date(lastIg.createdAt.getTime() + THIRTY_DAYS_MS)
    : null;

  return (
    <section className="max-w-2xl">
      <Link
        href="/io/analizza"
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Torna indietro
      </Link>
      <h1 className="mt-6 font-display text-3xl">Analizza il tuo profilo Instagram</h1>
      <p className="mt-3 text-sm text-paper-300">
        Inserisci l&apos;URL del tuo profilo pubblico: leggiamo le tue
        ultime foto e ti restituiamo una selezione di autori che risuonano
        con il tuo sguardo. L&apos;analisi può richiedere fino a 90 secondi.
      </p>

      <div className="mt-8">
        {available ? (
          <ProfileAuthedFlow />
        ) : (
          <div className="border border-paper-300/15 p-6">
            <p className="text-sm text-paper-300">
              Hai già fatto un&apos;analisi del profilo questo mese. Potrai
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
