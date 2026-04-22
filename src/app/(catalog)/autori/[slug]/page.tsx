import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getApi } from "@/server/trpc/server";
import { ContentCard } from "@/components/catalog/ContentCard";
import { MarkdownView } from "@/components/catalog/MarkdownView";
import { ROUTES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const api = await getApi();
  const author = await api.author.publicGetBySlug({ slug: params.slug });
  if (!author) return { title: params.slug };
  return {
    title: author.fullName,
    description: author.bioMd?.slice(0, 200) ?? `${author.fullName} su Ulilearn`,
    openGraph: {
      title: author.fullName,
      images: author.portraitUrl ? [{ url: author.portraitUrl }] : undefined,
      type: "profile",
    },
  };
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const api = await getApi();
  const author = await api.author.publicGetBySlug({ slug: params.slug });
  if (!author) notFound();

  const social = author.socialLinks as Record<string, string | null> | null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href={ROUTES.authors} className="text-sm text-paper-300 hover:text-paper-50">
        ← Autori
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div>
          <div className="aspect-[3/4] overflow-hidden bg-ink-800">
            {author.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.portraitUrl}
                alt={author.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-paper-400">
                Ritratto
              </div>
            )}
          </div>
          {(author.websiteUrl || social) && (
            <div className="mt-6 space-y-2 text-sm text-paper-300">
              {author.websiteUrl && (
                <a
                  href={author.websiteUrl}
                  target="_blank"
                  rel="noopener"
                  className="block hover:text-accent"
                >
                  Sito web →
                </a>
              )}
              {social?.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener"
                  className="block hover:text-accent"
                >
                  Instagram →
                </a>
              )}
              {social?.youtube && (
                <a
                  href={social.youtube}
                  target="_blank"
                  rel="noopener"
                  className="block hover:text-accent"
                >
                  YouTube →
                </a>
              )}
              {social?.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener"
                  className="block hover:text-accent"
                >
                  Twitter / X →
                </a>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h1 className="font-display text-display-lg leading-[1.05]">
            {author.fullName}
          </h1>
          {author.bioMd && (
            <div className="mt-6 max-w-2xl text-lg leading-relaxed">
              <MarkdownView source={author.bioMd} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="font-display text-2xl">Contenuti</h2>
        <div className="mt-6">
          {author.contentItems.length === 0 ? (
            <EmptyState
              title="Ancora nessun contenuto pubblicato"
              description="Stiamo lavorando ai prossimi materiali."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {author.contentItems.map((c) => (
                <ContentCard key={c.id} content={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
