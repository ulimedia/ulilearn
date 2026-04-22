"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { LeadMagnetForm, type LeadMagnetFormValues } from "./LeadMagnetForm";
import { LoadingNarrative } from "./loading-narrative";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function LeadMagnetFlow() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  const mutation = trpc.leadMagnet.analyze.useMutation({
    onSuccess: (data) => {
      // redirectUrl is a Supabase magic link that sets the session cookie
      // and lands on /io/analisi/<leadId>. It's absolute — use window.location.
      if (typeof window !== "undefined") {
        window.location.href = data.redirectUrl;
      }
    },
    onError: (err) => {
      setState({
        kind: "error",
        message: err.message || "Qualcosa non ha funzionato. Riprova.",
      });
    },
  });

  function handleSubmit(values: LeadMagnetFormValues) {
    setState({ kind: "loading" });
    const utm = typeof window !== "undefined" ? readUtm() : undefined;
    const referrerUrl = typeof document !== "undefined" ? document.referrer || undefined : undefined;
    mutation.mutate({
      email: values.email,
      instagramUrl: values.instagramUrl,
      marketingConsent: values.marketingConsent,
      turnstileToken: values.turnstileToken,
      utm,
      referrerUrl,
    });
  }

  if (state.kind === "loading" || mutation.isPending || mutation.isSuccess) {
    return <LoadingNarrative />;
  }
  return (
    <div>
      <LeadMagnetForm onSubmit={handleSubmit} />
      {state.kind === "error" && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}

function readUtm() {
  const p = new URLSearchParams(window.location.search);
  const source = p.get("utm_source") ?? undefined;
  const medium = p.get("utm_medium") ?? undefined;
  const campaign = p.get("utm_campaign") ?? undefined;
  if (!source && !medium && !campaign) return undefined;
  return { source, medium, campaign };
}
