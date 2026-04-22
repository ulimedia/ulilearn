import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/server/db/client";
import { ROUTES } from "@/lib/constants";
import { AuthorForm } from "@/components/admin/authors/AuthorForm";

export const metadata: Metadata = {
  title: "Modifica autore",
  robots: { index: false },
};

export default async function EditAuthorPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const author = await prisma.author.findUnique({ where: { id: params.id } });
  if (!author) notFound();

  const social = (author.socialLinks as Record<string, string> | null) ?? null;

  return (
    <section>
      <Link
        href={ROUTES.admin.authors}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Autori
      </Link>
      <h1 className="mt-4 font-display text-3xl">{author.fullName}</h1>
      <div className="mt-8">
        <AuthorForm
          initial={{
            id: author.id,
            fullName: author.fullName,
            slug: author.slug,
            bioMd: author.bioMd,
            portraitUrl: author.portraitUrl,
            websiteUrl: author.websiteUrl,
            socialLinks: social,
          }}
        />
      </div>
    </section>
  );
}
