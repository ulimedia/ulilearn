import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Registrati" };

export default function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl">Crea il tuo account</h1>
      <p className="mt-2 text-sm text-paper-300">Serve un minuto.</p>
      <SignupForm next={searchParams.next} />
      <p className="mt-6 text-sm text-paper-300">
        Hai già un account?{" "}
        <Link href={ROUTES.login} className="text-accent hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  );
}
