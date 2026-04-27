"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({
  initial,
}: {
  initial: { subscriberDiscountPercent: number };
}) {
  const router = useRouter();
  const [subscriberDiscountPercent, setDiscount] = useState(
    initial.subscriberDiscountPercent,
  );

  const update = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Impostazioni salvate");
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({ subscriberDiscountPercent });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6">
      <div>
        <Label htmlFor="discount">
          Sconto abbonati su acquisti singoli (%)
        </Label>
        <Input
          id="discount"
          type="number"
          min={0}
          max={100}
          required
          value={subscriberDiscountPercent}
          onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
        />
        <p className="mt-1 text-xs text-paper-400">
          Applicato a masterclass e workshop quando l&apos;acquirente ha un
          abbonamento Plus attivo. Il singolo contenuto può sovrascrivere
          questo valore impostando un prezzo abbonati esplicito.
        </p>
      </div>

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Salvo…" : "Salva"}
      </Button>
    </form>
  );
}
