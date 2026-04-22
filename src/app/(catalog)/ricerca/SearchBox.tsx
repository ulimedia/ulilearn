"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(`/ricerca?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca per titolo, autore, tag…"
        autoFocus
      />
      <Button type="submit">Cerca</Button>
    </form>
  );
}
