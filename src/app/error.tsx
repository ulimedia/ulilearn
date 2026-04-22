"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-5xl">Qualcosa è andato storto</p>
        <p className="mt-4 text-paper-300">
          Abbiamo registrato l&apos;errore. Riprova tra un momento.
        </p>
        <Button onClick={reset} className="mt-6">
          Riprova
        </Button>
      </div>
    </div>
  );
}
