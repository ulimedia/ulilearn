import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/require-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Profilo" };

export default async function ProfilePage() {
  const { profile } = await requireUser();

  // Check whether the user has set a password. Supabase stores this in
  // user_metadata.password_set (written by our admin.createUser flow and
  // flipped to true when the user sets one from here).
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const passwordSet = Boolean(authUser?.user_metadata?.password_set);

  return (
    <section>
      <h1 className="font-display text-3xl">Profilo</h1>

      {!passwordSet && (
        <div className="mt-6 border border-accent/40 bg-accent/5 p-5">
          <p className="font-display text-lg text-accent">Completa il tuo account</p>
          <p className="mt-2 text-sm text-paper-300">
            Imposta una password per poter rientrare in qualsiasi momento. Senza
            password, potrai accedere solo cliccando sul link magico via email.
          </p>
        </div>
      )}

      <dl className="mt-8 space-y-3 text-sm">
        <div>
          <dt className="text-paper-400">Email</dt>
          <dd>{profile.email}</dd>
        </div>
        <div>
          <dt className="text-paper-400">Nome</dt>
          <dd>{profile.fullName ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-10 border-t border-paper-300/10 pt-10">
        <h2 className="font-display text-2xl">
          {passwordSet ? "Cambia password" : "Imposta password"}
        </h2>
        <p className="mt-2 text-sm text-paper-400">
          {passwordSet
            ? "Inserisci una nuova password per sostituire quella attuale."
            : "Scegli una password di almeno 8 caratteri con un numero."}
        </p>
        <div className="mt-6 max-w-md">
          <SetPasswordForm hasPassword={passwordSet} />
        </div>
      </div>
    </section>
  );
}
