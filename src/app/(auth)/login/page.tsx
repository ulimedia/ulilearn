import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl">Accedi</h1>
      <p className="mt-2 text-sm text-paper-300">Bentornato.</p>
      <LoginForm next={searchParams.next} />
      <p className="mt-6 text-sm text-paper-300">
        Non hai un account?{" "}
        <Link href={ROUTES.signup} className="text-accent hover:underline">
          Registrati
        </Link>
      </p>
    </div>
  );
}
