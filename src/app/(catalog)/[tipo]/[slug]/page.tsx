import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getApi } from "@/server/trpc/server";
import { ContentRow } from "@/components/catalog/ContentRow";
import { MarkdownView } from "@/components/catalog/MarkdownView";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatCurrencyEUR, formatDateIT, formatDurationSeconds } from "@/lib/utils";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_FORMAT_LABELS,
  ROUTES,
} from "@/lib/constants";
import type { ContentType } from "@prisma/client";

const VALID_TIPI = ["lecture", "corso", "documentario", "masterclass", "workshop"] as const;
type Tipo = (typeof VALID_TIPI)[number];

function isValidTipo(t: string): t is Tipo {
  return (VALID_TIPI as readonly string[]).includes(t);
}

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: { tipo: string; slug: string };
}): Promise<Metadata> {
  if (!isValidTipo(params.tipo)) return { title: params.slug };
  const api = await getApi();
  const data = await api.content.publicGetBySlug({
    type: params.tipo,
    slug: params.slug,
  });
  if (!data?.item) return { title: params.slug };
  return {
    title: data.item.title,
    description: data.item.subtitle ?? undefined,
    openGraph: {
      title: data.item.title,
      description: data.item.subtitle ?? undefined,
      images: data.item.coverImageUrl ? [{ url: data.item.coverImageUrl }] : undefined,
      type: "article",
    },
  };
}

export default async function ContentDetailPage({
  params,
}: {
  params: { tipo: string; slug: string };
}) {
  if (!isValidTipo(params.tipo)) notFound();
  const api = await getApi();
  const data = await api.content.publicGetBySlug({
    type: params.tipo,
    slug: params.slug,
  });
  if (!data?.item) notFound();

  const { item, related } = data;
  const isLive = item.format !== "on_demand";
  const isUpcoming = item.liveStartAt
    ? new Date(item.liveStartAt).getTime() > Date.now()
    : false;
  const isPurchasable = item.isPurchasable;
  const seatsLeft =
    item.maxSeats != null ? Math.max(0, item.maxSeats - item.seatsTaken) : null;
  const isSoldOut = seatsLeft === 0;

  // CTA target: Block 4 will route purchasable to /checkout/[contentId];
  // for now we use /abbonati as placeholder for all paths.
  const watchHref = ROUTES.watch(item.id);
  const buyHref = isPurchasable ? `/checkout/${item.id}` : ROUTES.subscribe;

  return (
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href={`/${item.type}` as never}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← {CONTENT_TYPE_LABELS[item.type]}
      </Link>

      {item.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.coverImageUrl}
          alt=""
          className="mt-6 aspect-[16/9] w-full object-cover"
        />
      )}

      <header className="mt-8 space-y-4">
        <p className="text-xs uppercase tracking-widest text-accent">
          {CONTENT_TYPE_LABELS[item.type]}
          <span className="ml-2 text-paper-400">
            · {CONTENT_FORMAT_LABELS[item.format]}
          </span>
        </p>
        <h1 className="font-display text-display-lg leading-[1.05]">{item.title}</h1>
        {item.subtitle && (
          <p className="max-w-3xl text-lg text-paper-300">{item.subtitle}</p>
        )}

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-paper-300">
          {item.author && (
            <Link
              href={ROUTES.author(item.author.slug)}
              className="hover:text-accent"
            >
              {item.author.fullName}
            </Link>
          )}
          {item.durationSeconds > 0 && !isLive && (
            <span>{formatDurationSeconds(item.durationSeconds)}</span>
          )}
          {isLive && item.liveStartAt && (
            <span>{formatDateIT(item.liveStartAt)}</span>
          )}
          {item.location && <span>{item.location}</span>}
          {seatsLeft != null && (
            <span>
              {isSoldOut ? "Sold out" : `${seatsLeft} posti rimasti`}
            </span>
          )}
        </dl>
      </header>

      <CtaBlock
        item={item as { type: ContentType; isPurchasable: boolean; isFree: boolean; standalonePriceCents: number | null }}
        isUpcoming={isUpcoming}
        isSoldOut={isSoldOut}
        watchHref={watchHref}
        buyHref={buyHref}
      />

      {item.descriptionMd && (
        <section className="mt-12 max-w-3xl text-lg leading-relaxed">
          <MarkdownView source={item.descriptionMd} />
        </section>
      )}

      {item.modules.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl">Programma del corso</h2>
          <div className="mt-6 space-y-6">
            {item.modules.map((m, mi) => (
              <div key={m.id} className="border border-paper-300/15 p-5">
                <p className="text-xs uppercase tracking-widest text-paper-400">
                  Modulo {mi + 1}
                </p>
                <h3 className="mt-1 font-display text-xl">{m.title}</h3>
                {m.lessons.length > 0 && (
                  <ol className="mt-4 divide-y divide-paper-300/10 text-sm">
                    {m.lessons.map((l, li) => (
                      <li
                        key={l.id}
                        className="flex items-baseline justify-between gap-4 py-2"
                      >
                        <span>
                          <span className="text-paper-400">{li + 1}.</span>{" "}
                          {l.title}
                        </span>
                        {l.durationSeconds > 0 && (
                          <span className="text-xs text-paper-400">
                            {formatDurationSeconds(l.durationSeconds)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {item.tags.length > 0 && (
        <section className="mt-16">
          <p className="text-xs uppercase tracking-widest text-paper-400">Tag</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.map((t) => (
              <span
                key={t}
                className="bg-paper-50/5 px-3 py-1 text-xs text-paper-300"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20">
          <ContentRow title="Correlati" items={related} />
        </section>
      )}
    </article>
  );
}

function CtaBlock({
  item,
  isUpcoming,
  isSoldOut,
  watchHref,
  buyHref,
}: {
  item: { type: ContentType; isPurchasable: boolean; isFree: boolean; standalonePriceCents: number | null };
  isUpcoming: boolean;
  isSoldOut: boolean;
  watchHref: string;
  buyHref: string;
}) {
  if (item.isPurchasable) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-4 border-y border-paper-300/15 py-6">
        <div>
          <p className="font-display text-3xl">
            {item.standalonePriceCents != null
              ? formatCurrencyEUR(item.standalonePriceCents)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-paper-400">
            Sconto fisso per gli abbonati Plus
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          {isSoldOut ? (
            <span className="inline-flex h-11 items-center bg-paper-50/5 px-5 text-sm text-paper-400">
              Sold out
            </span>
          ) : (
            <Link href={buyHref} className={cn(buttonVariants({ size: "lg" }))}>
              {item.type === "workshop" ? "Iscriviti" : "Acquista"}
            </Link>
          )}
          <Link
            href={ROUTES.subscribe}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            Diventa Plus
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 border-y border-paper-300/15 py-6">
      <div>
        <p className="font-display text-2xl">Incluso in Ulilearn Plus</p>
        <p className="mt-1 text-sm text-paper-400">
          {isUpcoming
            ? "L'evento sarà disponibile on-demand dopo la diretta."
            : item.isFree
              ? "Contenuto gratuito, accessibile a tutti."
              : "Accesso illimitato per gli abbonati."}
        </p>
      </div>
      <div className="ml-auto flex flex-wrap gap-3">
        <Link href={watchHref} className={cn(buttonVariants({ size: "lg" }))}>
          {isUpcoming ? "Iscriviti alla diretta" : "Guarda ora"}
        </Link>
        <Link
          href={ROUTES.subscribe}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
        >
          Scopri Plus
        </Link>
      </div>
    </div>
  );
}
