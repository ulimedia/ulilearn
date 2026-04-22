import { render } from "@react-email/components";
import { getResendClient } from "./client";
import { prisma } from "@/server/db/client";
import { env } from "@/lib/env";
import { LeadMagnetReport } from "@/emails/LeadMagnetReport";
import type { LeadAnalysis } from "@/server/integrations/anthropic/schema";

export async function sendLeadMagnetReport(params: {
  leadId: string;
  to: string;
  analysis: LeadAnalysis;
}) {
  const ctaUrl = withUtm(
    env.LEAD_MAGNET_KAJABI_CTA_URL ??
      "https://ulilearn.academy/catalogo/abbonamento/ulilearn-plus/",
    { source: "lead_magnet", medium: "email", campaign: "scopri_autori" },
  );

  const html = await render(
    LeadMagnetReport({ analysis: params.analysis, ctaUrl }),
  );

  try {
    const result = await getResendClient().emails.send({
      from: env.EMAIL_FROM ?? "Ulilearn <hello@ulilearn.academy>",
      to: params.to,
      subject: `${params.analysis.headline} — la tua analisi Ulilearn`,
      html,
      tags: [
        { name: "template", value: "lead_magnet_report" },
        { name: "lead_id", value: params.leadId },
      ],
    });

    const messageId = result.data?.id ?? null;

    await prisma.lead.update({
      where: { id: params.leadId },
      data: {
        emailSentAt: new Date(),
        emailMessageId: messageId,
        status: "emailed",
      },
    });

    await prisma.emailEvent.create({
      data: {
        email: params.to,
        templateKey: "lead_magnet_report",
        providerMessageId: messageId,
        status: "sent",
        metadata: { leadId: params.leadId },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await prisma.emailEvent.create({
      data: {
        email: params.to,
        templateKey: "lead_magnet_report",
        status: "failed",
        metadata: { leadId: params.leadId, error: msg },
      },
    });
    throw e;
  }
}

function withUtm(
  baseUrl: string,
  utm: { source: string; medium: string; campaign: string },
) {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set("utm_source", utm.source);
    u.searchParams.set("utm_medium", utm.medium);
    u.searchParams.set("utm_campaign", utm.campaign);
    return u.toString();
  } catch {
    return baseUrl;
  }
}
