import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/server/db/client";
import { ROUTES } from "@/lib/constants";
import { ContentForm } from "@/components/admin/content/ContentForm";

export const metadata: Metadata = {
  title: "Modifica contenuto",
  robots: { index: false },
};

export default async function EditContentPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const content = await prisma.contentItem.findUnique({
    where: { id: params.id },
  });
  if (!content) notFound();

  return (
    <section>
      <Link
        href={ROUTES.admin.content}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Contenuti
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl">{content.title}</h1>
        <span className="text-xs text-paper-400">/{content.slug}</span>
      </div>
      <div className="mt-8">
        <ContentForm
          initial={{
            id: content.id,
            title: content.title,
            subtitle: content.subtitle,
            slug: content.slug,
            type: content.type,
            format: content.format,
            descriptionMd: content.descriptionMd,
            coverImageUrl: content.coverImageUrl,
            authorId: content.authorId,
            vimeoVideoId: content.vimeoVideoId,
            durationSeconds: content.durationSeconds,
            tags: content.tags,
            isFeatured: content.isFeatured,
            isFree: content.isFree,
            liveStartAt: content.liveStartAt,
            liveEndAt: content.liveEndAt,
            registrationDeadlineAt: content.registrationDeadlineAt,
            timezone: content.timezone,
            location: content.location,
            isPurchasable: content.isPurchasable,
            standalonePriceCents: content.standalonePriceCents,
            subscriberPriceCentsOverride: content.subscriberPriceCentsOverride,
            maxSeats: content.maxSeats,
            status: content.status,
            scheduledPublishAt: content.scheduledPublishAt,
          }}
        />
      </div>
    </section>
  );
}
