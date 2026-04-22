import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export function AuthorCard({
  author,
}: {
  author: {
    slug: string;
    fullName: string;
    portraitUrl?: string | null;
    _count?: { contentItems: number };
  };
}) {
  return (
    <Link href={ROUTES.author(author.slug)} className="group block">
      <div className="aspect-[3/4] overflow-hidden bg-ink-800">
        {author.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.portraitUrl}
            alt={author.fullName}
            className="h-full w-full object-cover transition-transform duration-500 ease-soft group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-paper-400">
            Ritratto
          </div>
        )}
      </div>
      <h3 className="mt-3 font-display text-xl text-paper-50 group-hover:text-accent">
        {author.fullName}
      </h3>
      {author._count && (
        <p className="mt-0.5 text-xs text-paper-400">
          {author._count.contentItems} contenut{author._count.contentItems === 1 ? "o" : "i"}
        </p>
      )}
    </Link>
  );
}
