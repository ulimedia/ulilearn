import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Il mio spazio" };

export default async function AccountHome() {
  const { profile } = await requireUser();
  return (
    <section>
      <h1 className="font-display text-display-lg">Ciao{profile.fullName ? `, ${profile.fullName}` : ""}</h1>
      <p className="mt-4 text-paper-300">
        Qui verranno &ldquo;Continua a guardare&rdquo;, ultime uscite, CTA esplora (PRD §6.6).
      </p>
    </section>
  );
}
