"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PASSWORD_RULE = /^(?=.*\d).{8,}$/;

export function SetPasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!PASSWORD_RULE.test(password)) {
      setError("Password: almeno 8 caratteri e un numero.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="new-password">
          {hasPassword ? "Nuova password" : "Password"}
        </Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && (
        <p className="text-sm text-accent">
          Password impostata. Ora puoi usarla per il login.
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Attendi…" : hasPassword ? "Aggiorna password" : "Imposta password"}
      </Button>
    </form>
  );
}
