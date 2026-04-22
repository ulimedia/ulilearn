import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContentListClient } from "./ContentListClient";

export const metadata: Metadata = { title: "Contenuti", robots: { index: false } };

export default function AdminContentsPage() {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Contenuti</h1>
        <Link
          href={ROUTES.admin.contentNew}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Nuovo contenuto
        </Link>
      </div>
      <div className="mt-8">
        <ContentListClient />
      </div>
    </section>
  );
}
