import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recupera password" };

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl">Recupera password</h1>
      <p className="mt-2 text-sm text-paper-300">
        Form di reset password da implementare nello Sprint 1 (PRD §6.1).
      </p>
    </div>
  );
}
