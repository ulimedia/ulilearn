import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { ContentForm } from "@/components/admin/content/ContentForm";

export const metadata: Metadata = {
  title: "Nuovo contenuto",
  robots: { index: false },
};

export default function NewContentPage() {
  return (
    <section>
      <Link
        href={ROUTES.admin.content}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Contenuti
      </Link>
      <h1 className="mt-4 font-display text-3xl">Nuovo contenuto</h1>
      <div className="mt-8">
        <ContentForm />
      </div>
    </section>
  );
}
