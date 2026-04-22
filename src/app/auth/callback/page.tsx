"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

/**
 * Handles BOTH Supabase auth redirect flavors:
 *   1. PKCE flow  → ?code=XXX   (new projects, server exchange)
 *   2. Implicit   → #access_token=...&refresh_token=... (admin.generateLink default)
 *
 * The browser Supabase client auto-parses the URL hash at init time and
 * populates the session. For the PKCE case we call exchangeCodeForSession.
 * On success we router.replace the `next` param (default /io).
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Waiting />}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? ROUTES.account.home;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const code = params.get("code");

      // Case 1: PKCE code exchange
      if (code) {
        const { error: xErr } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (xErr) {
          setError(xErr.message);
          return;
        }
        router.replace(next);
        return;
      }

      // Case 2: Implicit flow — the Supabase client auto-detects the session
      // from the URL hash at init. Wait one tick then check.
      await new Promise((r) => setTimeout(r, 100));
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        setError("Sessione non disponibile. Prova a ripetere l'accesso.");
        return;
      }

      // Clean the hash and navigate
      if (typeof window !== "undefined" && window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      router.replace(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, params, next]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="font-display text-2xl text-red-400">Accesso non riuscito</p>
          <p className="mt-3 text-sm text-paper-300">{error}</p>
          <a href="/login" className="mt-6 inline-block text-accent hover:underline">
            Torna al login
          </a>
        </div>
      </div>
    );
  }
  return <Waiting />;
}

function Waiting() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="font-display text-2xl">Ti stiamo portando dentro…</p>
        <p className="mt-3 text-sm text-paper-400">Un secondo.</p>
      </div>
    </div>
  );
}
