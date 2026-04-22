"use client";

import { env } from "@/lib/env";
import type { LeadAnalysis } from "@/server/integrations/anthropic/schema";

const KAJABI_URL =
  "https://ulilearn.academy/catalogo/abbonamento/ulilearn-plus/";

function buildCtaUrl(base: string) {
  try {
    const u = new URL(base);
    u.searchParams.set("utm_source", "lead_magnet");
    u.searchParams.set("utm_medium", "on_page");
    u.searchParams.set("utm_campaign", "scopri_autori");
    return u.toString();
  } catch {
    return base;
  }
}

export function AnalysisView({
  analysis,
  email,
}: {
  analysis: LeadAnalysis;
  email: string;
}) {
  const ctaUrl = buildCtaUrl(KAJABI_URL);
  return (
    <article className="space-y-10">
      <header>
        <h2 className="font-display text-display-lg">{analysis.headline}</h2>
        {analysis.caveat && (
          <p className="mt-4 border-l-2 border-paper-400 pl-4 text-sm italic text-paper-300">
            {analysis.caveat}
          </p>
        )}
      </header>

      <section className="space-y-5 text-lg leading-relaxed text-paper-100">
        {analysis.intro.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <AuthorsSection title="Autori contemporanei" authors={analysis.contemporary} />

      <CtaBanner ctaUrl={ctaUrl} />

      <AuthorsSection title="Autori storici" authors={analysis.historical} />

      <section className="space-y-5 border-t border-paper-300/10 pt-8 text-lg leading-relaxed text-paper-100">
        <p>{analysis.closing}</p>
      </section>

      <CtaBanner ctaUrl={ctaUrl} emphasized />

      <p className="text-sm text-paper-400">
        Salva questa pagina: il link è permanente e puoi condividerlo.
      </p>
    </article>
  );
}

function AuthorsSection({
  title,
  authors,
}: {
  title: string;
  authors: LeadAnalysis["contemporary"];
}) {
  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-paper-400">{title}</p>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {authors.map((a) => (
          <div key={a.name} className="border border-paper-300/10 p-5">
            <h3 className="font-display text-2xl">
              {a.name}
              {a.years && (
                <span className="ml-2 text-sm font-normal text-paper-400">{a.years}</span>
              )}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-paper-300">{a.why}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBanner({ ctaUrl, emphasized = false }: { ctaUrl: string; emphasized?: boolean }) {
  if (emphasized) {
    return (
      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-accent px-8 py-10 text-center text-accent-foreground transition-colors duration-250 ease-soft hover:bg-accent/90"
      >
        <p className="font-display text-3xl leading-tight">
          Entra nel catalogo Ulilearn Plus
        </p>
        <p className="mt-3 text-sm opacity-80">
          Lecture, corsi e documentari sugli autori che contano. Un solo abbonamento annuale.
        </p>
        <span className="mt-6 inline-block border-b border-accent-foreground pb-1 text-sm font-semibold">
          Scopri l&apos;abbonamento →
        </span>
      </a>
    );
  }
  return (
    <a
      href={ctaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-start justify-between gap-2 border border-accent/30 bg-accent/5 px-6 py-5 transition-colors duration-250 ease-soft hover:bg-accent/10 sm:flex-row sm:items-center"
    >
      <p className="font-display text-lg">
        Approfondisci con Ulilearn Plus →
      </p>
      <span className="text-sm text-accent">Scopri l&apos;abbonamento</span>
    </a>
  );
}

// keep env import warm so tree-shaking doesn't strip it if unused later
void env;
