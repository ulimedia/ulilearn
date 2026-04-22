import type { Metadata } from "next";
import { formatCurrencyEUR, formatDateIT } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/server/db/client";
import { getWeeklySpendCents } from "@/lib/ratelimit";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Lead magnet",
  robots: { index: false },
};

export default async function AdminLeadMagnetPage() {
  await requireAdmin();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [leads, totalLeads, leadsLast30d, convertedLast30d, weeklySpend] =
    await Promise.all([
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          email: true,
          instagramHandle: true,
          instagramUrl: true,
          status: true,
          analysisCostCents: true,
          emailSentAt: true,
          convertedUserId: true,
          convertedAt: true,
          createdAt: true,
        },
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      prisma.lead.count({
        where: { convertedUserId: { not: null }, createdAt: { gte: since } },
      }),
      getWeeklySpendCents(),
    ]);

  const conversionRate = leadsLast30d ? convertedLast30d / leadsLast30d : 0;
  const weeklyCap = env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000;

  return (
    <section>
      <h1 className="font-display text-3xl">Lead magnet</h1>
      <p className="mt-2 text-sm text-paper-300">
        Analisi Instagram → autori. PRD §6.8 / lead gen.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Lead totali" value={totalLeads.toString()} />
        <Kpi label="Ultimi 30gg" value={leadsLast30d.toString()} />
        <Kpi
          label="Conversion 30gg"
          value={`${(conversionRate * 100).toFixed(1)}%`}
          sub={`${convertedLast30d} su ${leadsLast30d}`}
        />
        <Kpi
          label="Spesa settimana"
          value={formatCurrencyEUR(weeklySpend)}
          sub={`cap ${formatCurrencyEUR(weeklyCap)}`}
        />
      </div>

      <div className="mt-10 overflow-x-auto border border-paper-300/10">
        <table className="w-full text-sm">
          <thead className="bg-ink-800 text-xs uppercase tracking-wider text-paper-400">
            <tr>
              <Th>Data</Th>
              <Th>Email</Th>
              <Th>Handle</Th>
              <Th>Status</Th>
              <Th>Costo</Th>
              <Th>Email inviata</Th>
              <Th>Convertito</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-paper-300/10">
                <Td>{formatDateIT(l.createdAt)}</Td>
                <Td>{l.email}</Td>
                <Td>
                  <a
                    href={l.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {l.instagramHandle ?? "—"}
                  </a>
                </Td>
                <Td>
                  <StatusBadge status={l.status} />
                </Td>
                <Td>
                  {l.analysisCostCents
                    ? formatCurrencyEUR(l.analysisCostCents)
                    : "—"}
                </Td>
                <Td>{l.emailSentAt ? formatDateIT(l.emailSentAt) : "—"}</Td>
                <Td>{l.convertedAt ? formatDateIT(l.convertedAt) : "—"}</Td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-paper-400">
                  Nessun lead ancora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-paper-300/15 p-5">
      <p className="text-xs uppercase tracking-wide text-paper-400">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-paper-400">{sub}</p>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-paper-400/20 text-paper-300",
    analyzed: "bg-blue-500/20 text-blue-200",
    emailed: "bg-green-500/20 text-green-200",
    converted: "bg-accent/20 text-accent",
    bounced: "bg-red-500/20 text-red-300",
  };
  return (
    <span className={`inline-block px-2 py-1 text-xs ${colors[status] ?? "bg-paper-400/20 text-paper-300"}`}>
      {status}
    </span>
  );
}
