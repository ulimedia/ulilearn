import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthorListClient } from "./AuthorListClient";

export const metadata: Metadata = { title: "Autori", robots: { index: false } };

export default function AdminAuthorsPage() {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Autori</h1>
        <Link
          href={ROUTES.admin.authorNew}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Nuovo autore
        </Link>
      </div>
      <div className="mt-8">
        <AuthorListClient />
      </div>
    </section>
  );
}
