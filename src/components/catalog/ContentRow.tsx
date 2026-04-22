import Link from "next/link";
import { ContentCard, type ContentCardData } from "./ContentCard";

export function ContentRow({
  title,
  items,
  seeAllHref,
}: {
  title: string;
  items: ContentCardData[];
  seeAllHref?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-sm text-paper-300 hover:text-accent">
            Tutti →
          </Link>
        )}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {items.slice(0, 4).map((c) => (
          <ContentCard key={c.id} content={c} size="md" />
        ))}
      </div>
    </section>
  );
}
