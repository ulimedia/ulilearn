"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export type LeadMagnetFormValues = {
  instagramUrl: string;
  email: string;
  marketingConsent: boolean;
  turnstileToken: string;
};

const IG_URL_RE =
  /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?(\?.*)?$/;

export function LeadMagnetForm({
  onSubmit,
}: {
  onSubmit: (values: LeadMagnetFormValues) => void;
}) {
  const [instagramUrl, setInstagramUrl] = useState("");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const turnstileRef = useRef<HTMLDivElement | null>(null);

  useTurnstile(turnstileRef, (token) => setTurnstileToken(token));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<string, string>> = {};
    if (!IG_URL_RE.test(instagramUrl.trim())) {
      errs.instagramUrl = "Inserisci un URL valido, es. https://www.instagram.com/tuo_handle";
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
      instagramUrl: instagramUrl.trim(),
      email: email.trim().toLowerCase(),
      marketingConsent,
      turnstileToken: turnstileToken ?? "dev",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="instagramUrl">URL del tuo profilo Instagram</Label>
        <Input
          id="instagramUrl"
          placeholder="https://www.instagram.com/tuo_handle"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          required
          autoComplete="off"
          inputMode="url"
        />
        {errors.instagramUrl && (
          <p className="text-sm text-red-400">{errors.instagramUrl}</p>
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
          Usiamo l&apos;email per inviarti l&apos;analisi. Niente spam.
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
        Analizza il mio profilo
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
