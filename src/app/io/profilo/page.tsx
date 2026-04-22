import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Profilo" };

export default async function ProfilePage() {
  const { profile } = await requireUser();
  return (
    <section>
      <h1 className="font-display text-3xl">Profilo</h1>
      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="text-paper-400">Email</dt>
          <dd>{profile.email}</dd>
        </div>
        <div>
          <dt className="text-paper-400">Nome</dt>
          <dd>{profile.fullName ?? "—"}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-paper-400">
        Editor profilo + preferenze email + cambio password — Sprint 6.
      </p>
    </section>
  );
}
