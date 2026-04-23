"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingNarrative } from "@/app/(landing)/analizza-progetto/loading-narrative";

const MIN_LEN = 120;
const MAX_LEN = 4000;

export function ProjectAuthedFlow() {
  const router = useRouter();
  const [projectBrief, setProjectBrief] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const mutation = trpc.leadMagnet.analyzeProjectAuthed.useMutation({
    onSuccess: (data) => {
      router.push(`/io/analisi/${data.leadId}`);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<string, string>> = {};
    const brief = projectBrief.trim();
    if (brief.length < MIN_LEN) {
      errs.projectBrief = `Scrivi almeno ${MIN_LEN} caratteri (ora ${brief.length}).`;
    } else if (brief.length > MAX_LEN) {
      errs.projectBrief = `Hai superato i ${MAX_LEN} caratteri.`;
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    mutation.mutate({ projectBrief: brief });
  }

  if (mutation.isPending || mutation.isSuccess) {
    return <LoadingNarrative />;
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
              briefLen > 0 ? (briefOk ? "text-paper-300" : "text-red-400") : ""
            }
          >
            {briefLen}/{MAX_LEN}
          </span>
        </div>
        {errors.projectBrief && (
          <p className="text-sm text-red-400">{errors.projectBrief}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full">
        Analizza il mio progetto
      </Button>

      {mutation.isError && (
        <p className="text-sm text-red-400" role="alert">
          {humanizeError(mutation.error?.message ?? "")}
        </p>
      )}
    </form>
  );
}

function humanizeError(raw: string): string {
  return raw.replace(/^\[[a-z_]+\]\s*/, "");
}
