"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  LeadMagnetProjectForm,
  type LeadMagnetProjectFormValues,
} from "./LeadMagnetProjectForm";
import { LoadingNarrative } from "./loading-narrative";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function LeadMagnetProjectFlow() {
  const [state, setState] = useState<State>({ kind: "idle" });

  const mutation = trpc.leadMagnet.analyzeProject.useMutation({
    onSuccess: (data) => {
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

  function handleSubmit(values: LeadMagnetProjectFormValues) {
    setState({ kind: "loading" });
    const utm = typeof window !== "undefined" ? readUtm() : undefined;
    const referrerUrl =
      typeof document !== "undefined" ? document.referrer || undefined : undefined;
    mutation.mutate({
      email: values.email,
      projectBrief: values.projectBrief,
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
      <LeadMagnetProjectForm onSubmit={handleSubmit} />
      {state.kind === "error" && (
        <div className="mt-4 text-sm text-red-400" role="alert">
          <p>{humanizeError(state.message)}</p>
          {state.message.includes("[email_exists]") && (
            <p className="mt-2">
              <a href="/login" className="text-accent underline">
                Accedi con la tua email
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function humanizeError(raw: string): string {
  return raw.replace(/^\[[a-z_]+\]\s*/, "");
}

function readUtm() {
  const p = new URLSearchParams(window.location.search);
  const source = p.get("utm_source") ?? undefined;
  const medium = p.get("utm_medium") ?? undefined;
  const campaign = p.get("utm_campaign") ?? undefined;
  if (!source && !medium && !campaign) return undefined;
  return { source, medium, campaign };
}
