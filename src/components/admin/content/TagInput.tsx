"use client";

import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";

export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim().toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
    setDraft("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 border border-paper-300/30 bg-ink-900 px-2 py-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-paper-50/10 px-2 py-0.5 text-xs text-paper-50"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="text-paper-400 hover:text-paper-50"
              aria-label={`Rimuovi ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <Input
          className="h-8 min-w-[120px] flex-1 border-0 bg-transparent px-1 focus-visible:outline-none focus-visible:ring-0"
          placeholder={value.length === 0 ? "Aggiungi tag…" : ""}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
        />
      </div>
      <p className="text-xs text-paper-400">
        Invio o virgola per aggiungere. Backspace per rimuovere l&apos;ultimo.
      </p>
    </div>
  );
}
