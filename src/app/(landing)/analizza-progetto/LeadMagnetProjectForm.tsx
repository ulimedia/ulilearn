"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export type LeadMagnetProjectFormValues = {
  projectBrief: string;
  email: string;
  marketingConsent: boolean;
  turnstileToken: string;
};

const MIN_LEN = 120;
const MAX_LEN = 4000;

export function LeadMagnetProjectForm({
  onSubmit,
}: {
  onSubmit: (values: LeadMagnetProjectFormValues) => void;
}) {
  const [projectBrief, setProjectBrief] = useState("");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const turnstileRef = useRef<HTMLDivElement | null>(null);

  useTurnstile(turnstileRef, (token) => setTurnstileToken(token));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<string, string>> = {};
    const brief = projectBrief.trim();
    if (brief.length < MIN_LEN) {
      errs.projectBrief = `Scrivi almeno ${MIN_LEN} caratteri (ora ${brief.length}).`;
    } else if (brief.length > MAX_LEN) {
      errs.projectBrief = `Hai superato i ${MAX_LEN} caratteri.`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Inserisci un'email valida.";
    }
    if (env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      errs.turnstile = "Attendi un attimo, stiamo verificando che sei umano.";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSubmit({
      projectBrief: brief,
      email: email.trim().toLowerCase(),
      marketingConsent,
      turnstileToken: turnstileToken ?? "dev",
    });
  }

  const briefLen = projectBrief.trim().length;
  const briefOk = briefLen >= MIN_LEN && briefLen <= MAX_LEN;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="projectBrief">L&apos;idea del tuo progetto</Label>
        <Textarea
          id="projectBrief"
          placeholder="Raccontaci l'idea come la racconteresti a un amico: soggetto, luoghi, tempi, perché ti interessa. Non serve essere definitivi — ci serve la direzione."
          value={projectBrief}
          onChange={(e) => setProjectBrief(e.target.value)}
          required
          rows={8}
          className="min-h-[180px]"
        />
        <div className="flex items-center justify-between text-xs text-paper-400">
          <span>
            Minimo {MIN_LEN} caratteri. Meglio 300–800 per un&apos;analisi
            puntuale.
          </span>
          <span
            className={
              briefLen > 0
                ? briefOk
                  ? "text-paper-300"
                  : "text-red-400"
                : ""
            }
          >
            {briefLen}/{MAX_LEN}
          </span>
        </div>
        {errors.projectBrief && (
          <p className="text-sm text-red-400">{errors.projectBrief}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">La tua email</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.it"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <p className="text-xs text-paper-400">
          La usiamo solo per ricontattarti sui nuovi contenuti Ulilearn. Niente spam.
        </p>
        {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
      </div>

      <label className="flex items-start gap-3 text-sm text-paper-300">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          Voglio ricevere occasionali suggerimenti editoriali da Ulilearn. Posso
          disiscrivermi in qualsiasi momento.
        </span>
      </label>

      {env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <div>
          <div ref={turnstileRef} />
          {errors.turnstile && (
            <p className="text-sm text-red-400">{errors.turnstile}</p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full">
        Analizza il mio progetto
      </Button>

      <p className="text-center text-xs text-paper-400">
        Cliccando confermi di aver letto la{" "}
        <a href="/privacy" className="underline">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}

function useTurnstile(
  ref: React.RefObject<HTMLDivElement>,
  onToken: (t: string) => void,
) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return;
    if (document.querySelector('script[data-ulilearn-turnstile]')) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.ulilearnTurnstile = "1";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !ref.current || !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return;
    // @ts-expect-error — Turnstile is injected globally by the script
    const turnstile = window.turnstile;
    if (!turnstile) return;
    turnstile.render(ref.current, {
      sitekey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token: string) => onToken(token),
    });
  }, [loaded, ref, onToken]);
}
