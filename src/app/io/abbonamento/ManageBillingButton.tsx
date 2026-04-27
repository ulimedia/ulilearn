"use client";

import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";

export function ManageBillingButton() {
  const portal = trpc.subscription.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <button
      type="button"
      disabled={portal.isPending}
      onClick={() => portal.mutate()}
      className="inline-flex h-11 items-center justify-center bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
    >
      {portal.isPending ? "Apro il portale…" : "Gestisci abbonamento"}
    </button>
  );
}
