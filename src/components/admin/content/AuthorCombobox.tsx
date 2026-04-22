"use client";

import { trpc } from "@/lib/trpc/client";
import { Select } from "@/components/ui/select";

export function AuthorCombobox({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  // Simple select for now; full combobox w/ search can come later.
  const query = trpc.author.listMini.useQuery({});

  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">— Nessun autore —</option>
      {query.data?.map((a) => (
        <option key={a.id} value={a.id}>
          {a.fullName}
        </option>
      ))}
    </Select>
  );
}
