import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { AuthorForm } from "@/components/admin/authors/AuthorForm";

export const metadata: Metadata = {
  title: "Nuovo autore",
  robots: { index: false },
};

export default function NewAuthorPage() {
  return (
    <section>
      <Link
        href={ROUTES.admin.authors}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Autori
      </Link>
      <h1 className="mt-4 font-display text-3xl">Nuovo autore</h1>
      <div className="mt-8">
        <AuthorForm />
      </div>
    </section>
  );
}
