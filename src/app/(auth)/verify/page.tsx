import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verifica email" };

export default function VerifyPage({ searchParams }: { searchParams: { email?: string } }) {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl">Controlla la tua email</h1>
      <p className="mt-4 text-sm text-paper-300">
        Ti abbiamo inviato un link di verifica{searchParams.email ? ` a ${searchParams.email}` : ""}.
        Cliccalo per attivare l&apos;account.
      </p>
    </div>
  );
}
