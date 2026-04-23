import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/server/db/client";
import {
  leadAnalysisSchema,
  projectAnalysisSchema,
} from "@/server/integrations/anthropic/schema";
import { AnalysisView } from "@/app/(landing)/scopri-autori/AnalysisView";
import { ProjectAnalysisView } from "@/app/(landing)/analizza-progetto/AnalysisView";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "La tua analisi",
  robots: { index: false },
};

export default async function AnalysisDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireUser();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    notFound();
  }

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    select: {
      convertedUserId: true,
      email: true,
      source: true,
      projectBrief: true,
      analysisJson: true,
      scrapedImages: true,
    },
  });

  if (!lead || lead.convertedUserId !== profile.id || !lead.analysisJson) {
    notFound();
  }

  const body = renderBody(lead);
  if (!body) notFound();

  return (
    <section>
      <Link
        href={ROUTES.account.analisi}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Tutte le analisi
      </Link>
      <div className="mt-6">{body}</div>
    </section>
  );
}

function renderBody(lead: {
  email: string;
  source: "lead_magnet_ig" | "lead_magnet_project";
  projectBrief: string | null;
  analysisJson: unknown;
  scrapedImages: string[];
}) {
  if (lead.source === "lead_magnet_project") {
    const parsed = projectAnalysisSchema.safeParse(lead.analysisJson);
    if (!parsed.success) return null;
    return <ProjectAnalysisView analysis={parsed.data} brief={lead.projectBrief} />;
  }
  const parsed = leadAnalysisSchema.safeParse(lead.analysisJson);
  if (!parsed.success) return null;
  return (
    <AnalysisView
      analysis={parsed.data}
      email={lead.email}
      images={lead.scrapedImages}
    />
  );
}
