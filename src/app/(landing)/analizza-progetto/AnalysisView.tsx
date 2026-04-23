"use client";

import type { ProjectAnalysis } from "@/server/integrations/anthropic/schema";

const KAJABI_URL =
  "https://ulilearn.academy/catalogo/abbonamento/ulilearn-plus/";

function buildCtaUrl(base: string) {
  try {
    const u = new URL(base);
    u.searchParams.set("utm_source", "lead_magnet");
    u.searchParams.set("utm_medium", "on_page");
    u.searchParams.set("utm_campaign", "analizza_progetto");
    return u.toString();
  } catch {
    return base;
  }
}

export function ProjectAnalysisView({
  analysis,
  brief,
}: {
  analysis: ProjectAnalysis;
  brief?: string | null;
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

      {brief && (
        <section>
          <p className="text-xs uppercase tracking-widest text-paper-400">
            La tua idea
          </p>
          <p className="mt-3 whitespace-pre-wrap border-l-2 border-paper-300/20 pl-4 text-paper-200">
            {brief}
          </p>
        </section>
      )}

      <section className="space-y-5 text-lg leading-relaxed text-paper-100">
        {analysis.reading.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <TwoColumn
        leftTitle="Punti di forza"
        leftItems={analysis.strengths}
        rightTitle="Rischi da presidiare"
        rightItems={analysis.risks}
      />

      <CtaBanner ctaUrl={ctaUrl} />

      <section>
        <p className="text-xs uppercase tracking-widest text-paper-400">
          Prossimi passi
        </p>
        <ol className="mt-6 space-y-4">
          {analysis.nextSteps.map((step, i) => (
            <li key={i} className="flex gap-4 border border-paper-300/10 p-4">
              <span className="font-display text-2xl text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-sm leading-relaxed text-paper-200">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-paper-400">
          Progetti che risuonano
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {analysis.similarProjects.map((p, i) => (
            <div key={`${p.title}-${i}`} className="border border-paper-300/10 p-5">
              <h3 className="font-display text-xl">
                {p.title}
                {p.years && (
                  <span className="ml-2 text-sm font-normal text-paper-400">
                    {p.years}
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-paper-400">di {p.author}</p>
              <p className="mt-3 text-sm leading-relaxed text-paper-300">{p.why}</p>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block border-b border-accent/50 pb-0.5 text-xs font-semibold text-accent hover:border-accent"
                >
                  Fonte ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

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

function TwoColumn({
  leftTitle,
  leftItems,
  rightTitle,
  rightItems,
}: {
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
}) {
  return (
    <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-widest text-paper-400">
          {leftTitle}
        </p>
        <ul className="mt-4 space-y-3">
          {leftItems.map((item, i) => (
            <li
              key={i}
              className="border-l-2 border-accent/50 pl-4 text-sm leading-relaxed text-paper-200"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-paper-400">
          {rightTitle}
        </p>
        <ul className="mt-4 space-y-3">
          {rightItems.map((item, i) => (
            <li
              key={i}
              className="border-l-2 border-paper-400/40 pl-4 text-sm leading-relaxed text-paper-200"
            >
              {item}
            </li>
          ))}
        </ul>
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
