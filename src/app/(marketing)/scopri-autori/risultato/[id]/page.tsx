import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/db/client";
import { leadAnalysisSchema } from "@/server/integrations/anthropic/schema";
import { AnalysisView } from "../../AnalysisView";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "La tua analisi",
  description: "Analisi curatoriale del tuo sguardo e selezione autori.",
  robots: { index: false, follow: false },
};

// The lead_id UUID is 122 bits of entropy — functionally impossible to guess.
// Direct access by URL is intentional (Typeform-results pattern): the user
// can share or bookmark their own analysis.

export default async function ResultPage({ params }: { params: { id: string } }) {
  // Basic UUID shape check
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    notFound();
  }

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    select: { analysisJson: true, email: true, emailSentAt: true, status: true },
  });

  if (!lead || !lead.analysisJson) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-display-lg">La tua analisi non è pronta</h1>
        <p className="mt-6 text-paper-300">
          {lead
            ? "Stiamo ancora lavorando sul tuo report. Riceverai tutto via email appena pronto."
            : "Link non valido o scaduto."}
        </p>
        <Link
          href={ROUTES.scopriAutori}
          className="mt-8 inline-block text-accent hover:underline"
        >
          Torna al form
        </Link>
      </div>
    );
  }

  const parsed = leadAnalysisSchema.safeParse(lead.analysisJson);
  if (!parsed.success) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-accent">Ulilearn · La tua analisi</p>
      <div className="mt-4">
        <AnalysisView analysis={parsed.data} email={lead.email} />
      </div>
      <div className="mt-16 border-t border-paper-300/10 pt-10 text-center">
        <Link
          href={ROUTES.scopriAutori}
          className="text-sm text-paper-300 hover:text-paper-50"
        >
          ← Genera un&apos;altra analisi
        </Link>
      </div>
    </div>
  );
}
