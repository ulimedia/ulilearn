import Link from "next/link";
import { CONTENT_TYPE_LABELS, ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentCardData } from "./ContentCard";

export function HeroFeatured({ content }: { content: ContentCardData & { subtitle?: string | null } }) {
  return (
    <Link
      href={ROUTES.contentItem(content.type, content.slug)}
      className="group relative block overflow-hidden"
    >
      <div className="relative aspect-[21/9] w-full bg-ink-800">
        {content.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.coverImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-70 transition-opacity duration-500 group-hover:opacity-90"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-bg via-ink-bg/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 sm:p-10 lg:p-12">
          <p className="text-xs uppercase tracking-widest text-accent">
            In evidenza · {CONTENT_TYPE_LABELS[content.type]}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-display-lg leading-[1.05]">
            {content.title}
          </h1>
          {content.subtitle && (
            <p className="mt-3 max-w-2xl text-paper-300">{content.subtitle}</p>
          )}
          <span
            className={cn(
              buttonVariants({ size: "md" }),
              "mt-6 pointer-events-none",
            )}
          >
            Scopri →
          </span>
        </div>
      </div>
    </Link>
  );
}
