"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Sto leggendo la tua idea…",
  "Sto rintracciando i riferimenti impliciti…",
  "Sto cercando progetti fotografici reali che risuonano con la tua direzione…",
  "Sto verificando le fonti sul web…",
  "Sto componendo la lettura critica…",
  "Ci siamo quasi…",
];

export function LoadingNarrative() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setI((prev) => Math.min(prev + 1, PHRASES.length - 1));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border border-paper-300/15 p-10 text-center">
      <div className="mx-auto h-1 w-16 overflow-hidden bg-paper-300/10">
        <div
          className="h-full w-1/3 bg-accent"
          style={{
            animation: "ulilearn-sweep 1.4s cubic-bezier(0.4,0,0.2,1) infinite",
          }}
        />
      </div>
      <p className="mt-8 font-display text-2xl leading-tight">{PHRASES[i]}</p>
      <p className="mt-4 text-sm text-paper-400">
        L&apos;analisi può richiedere fino a 90 secondi. Non chiudere la finestra.
      </p>
      <style jsx>{`
        @keyframes ulilearn-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
