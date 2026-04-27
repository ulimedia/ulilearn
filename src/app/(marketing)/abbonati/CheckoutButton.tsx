"use client";

import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";

export function CheckoutButton({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const checkout = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <button
      type="button"
      disabled={checkout.isPending}
      onClick={() => checkout.mutate({ planId })}
      className="inline-flex h-12 items-center justify-center bg-accent px-6 text-base font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
    >
      {checkout.isPending ? "Redirect a Stripe…" : `Abbonati — ${planName}`}
    </button>
  );
}
