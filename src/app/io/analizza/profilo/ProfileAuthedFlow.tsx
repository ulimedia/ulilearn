"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingNarrative } from "@/app/(landing)/scopri-autori/loading-narrative";

const IG_URL_RE =
  /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?(\?.*)?$/;

export function ProfileAuthedFlow() {
  const router = useRouter();
  const [instagramUrl, setInstagramUrl] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const mutation = trpc.leadMagnet.analyzeAuthed.useMutation({
    onSuccess: (data) => {
      router.push(`/io/analisi/${data.leadId}`);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<string, string>> = {};
    if (!IG_URL_RE.test(instagramUrl.trim())) {
      errs.instagramUrl =
        "Inserisci un URL valido, es. https://www.instagram.com/tuo_handle";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    mutation.mutate({ instagramUrl: instagramUrl.trim() });
  }

  if (mutation.isPending || mutation.isSuccess) {
    return <LoadingNarrative />;
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
        <p className="text-xs text-paper-400">
          Il profilo deve essere pubblico.
        </p>
        {errors.instagramUrl && (
          <p className="text-sm text-red-400">{errors.instagramUrl}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full">
        Analizza il mio profilo
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
