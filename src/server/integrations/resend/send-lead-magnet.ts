import { render } from "@react-email/components";
import { getResendClient } from "./client";
import { prisma } from "@/server/db/client";
import { env } from "@/lib/env";
import { LeadMagnetReport } from "@/emails/LeadMagnetReport";
import { LeadMagnetProjectReport } from "@/emails/LeadMagnetProjectReport";
import type {
  LeadAnalysis,
  ProjectAnalysis,
} from "@/server/integrations/anthropic/schema";

type SendArgs =
  | {
      leadId: string;
      to: string;
      source: "lead_magnet_ig";
      analysis: LeadAnalysis;
    }
  | {
      leadId: string;
      to: string;
      source: "lead_magnet_project";
      analysis: ProjectAnalysis;
    };

export async function sendLeadMagnetReport(params: SendArgs) {
  const campaign =
    params.source === "lead_magnet_project" ? "analizza_progetto" : "scopri_autori";
  const templateKey =
    params.source === "lead_magnet_project"
      ? "lead_magnet_project_report"
      : "lead_magnet_report";

  const ctaUrl = withUtm(
    env.LEAD_MAGNET_KAJABI_CTA_URL ??
      "https://ulilearn.academy/catalogo/abbonamento/ulilearn-plus/",
    { source: "lead_magnet", medium: "email", campaign },
  );

  const html = await render(
    params.source === "lead_magnet_project"
      ? LeadMagnetProjectReport({ analysis: params.analysis, ctaUrl })
      : LeadMagnetReport({ analysis: params.analysis, ctaUrl }),
  );

  try {
    const result = await getResendClient().emails.send({
      from: env.EMAIL_FROM ?? "Ulilearn <hello@ulilearn.academy>",
      to: params.to,
      subject: `${params.analysis.headline} — la tua analisi Ulilearn`,
      html,
      tags: [
        { name: "template", value: templateKey },
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
        templateKey,
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
        templateKey,
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
