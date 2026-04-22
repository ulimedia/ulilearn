import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/server/db/client";
import { leadAnalysisSchema } from "@/server/integrations/anthropic/schema";
import { AnalysisView } from "@/app/(marketing)/scopri-autori/AnalysisView";
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
      analysisJson: true,
      scrapedImages: true,
    },
  });

  // Must exist, belong to this user, and have a parsed analysis.
  if (!lead || lead.convertedUserId !== profile.id || !lead.analysisJson) {
    notFound();
  }

  const parsed = leadAnalysisSchema.safeParse(lead.analysisJson);
  if (!parsed.success) notFound();

  return (
    <section>
      <Link
        href={ROUTES.account.analisi}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Tutte le analisi
      </Link>
      <div className="mt-6">
        <AnalysisView
          analysis={parsed.data}
          email={lead.email}
          images={lead.scrapedImages}
        />
      </div>
    </section>
  );
}
