"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { LeadMagnetForm, type LeadMagnetFormValues } from "./LeadMagnetForm";
import { LoadingNarrative } from "./loading-narrative";
import { AnalysisView } from "./AnalysisView";
import type { LeadAnalysis } from "@/server/integrations/anthropic/schema";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; analysis: LeadAnalysis; email: string }
  | { kind: "error"; message: string };

export function LeadMagnetFlow() {
  const [state, setState] = useState<State>({ kind: "idle" });

  const mutation = trpc.leadMagnet.analyze.useMutation({
    onSuccess: (data, variables) => {
      setState({ kind: "success", analysis: data.analysis, email: variables.email });
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

  if (state.kind === "loading") {
    return <LoadingNarrative />;
  }
  if (state.kind === "success") {
    return <AnalysisView analysis={state.analysis} email={state.email} />;
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
