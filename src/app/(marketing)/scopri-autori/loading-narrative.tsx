"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Sto osservando il tuo handle…",
  "Sto cercando autori che ti assomigliano…",
  "Sto scegliendo le parole giuste…",
  "Ci siamo quasi…",
];

export function LoadingNarrative() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setI((prev) => Math.min(prev + 1, PHRASES.length - 1));
    }, 5000);
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
      <p className="mt-3 text-sm text-paper-400">
        Stiamo chiedendo a Claude di lavorare per suggestioni.
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
