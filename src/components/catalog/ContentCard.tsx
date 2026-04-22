import Link from "next/link";
import { CONTENT_TYPE_LABELS, ROUTES } from "@/lib/constants";
import {
  formatCurrencyEUR,
  formatDateIT,
  formatDurationSeconds,
} from "@/lib/utils";
import type { ContentType } from "@prisma/client";

export type ContentCardData = {
  id: string;
  slug: string;
  type: ContentType;
  title: string;
  subtitle?: string | null;
  coverImageUrl?: string | null;
  durationSeconds?: number;
  liveStartAt?: Date | string | null;
  isPurchasable?: boolean;
  standalonePriceCents?: number | null;
  isFree?: boolean;
  author?: { fullName: string; slug: string } | null;
};

export function ContentCard({
  content,
  size = "md",
}: {
  content: ContentCardData;
  size?: "sm" | "md" | "lg";
}) {
  const aspectClass =
    size === "lg" ? "aspect-[16/9]" : "aspect-[4/3]";
  const titleClass =
    size === "lg"
      ? "font-display text-2xl"
      : size === "sm"
        ? "font-display text-base"
        : "font-display text-lg";

  const live = content.liveStartAt ? new Date(content.liveStartAt) : null;
  const isUpcoming = live ? live.getTime() > Date.now() : false;

  return (
    <Link
      href={ROUTES.contentItem(content.type, content.slug)}
      className="group block"
    >
      <div className={`${aspectClass} relative overflow-hidden bg-ink-800`}>
        {content.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-soft group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-paper-400">
            {CONTENT_TYPE_LABELS[content.type]}
          </div>
        )}
        {isUpcoming && live && (
          <span className="absolute left-2 top-2 bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
            {formatDateIT(live)}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs uppercase tracking-widest text-paper-400">
          {CONTENT_TYPE_LABELS[content.type]}
          {content.author && (
            <span className="ml-2 text-paper-300">· {content.author.fullName}</span>
          )}
        </p>
        <h3 className={`mt-1 ${titleClass} leading-tight text-paper-50 group-hover:text-accent`}>
          {content.title}
        </h3>
        {content.subtitle && size !== "sm" && (
          <p className="mt-1 line-clamp-2 text-sm text-paper-400">{content.subtitle}</p>
        )}
        <p className="mt-2 text-xs text-paper-400">
          {content.isPurchasable && content.standalonePriceCents != null
            ? formatCurrencyEUR(content.standalonePriceCents)
            : content.isFree
              ? "Gratuito"
              : content.durationSeconds && content.durationSeconds > 0
                ? formatDurationSeconds(content.durationSeconds)
                : "Incluso in Plus"}
        </p>
      </div>
    </Link>
  );
}
