import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../init";
import {
  contentListInputSchema,
  contentTypeEnum,
  contentFormatEnum,
  contentUpsertSchema,
} from "@/server/content/schemas";
import { ensureUniqueContentSlug, toSlug } from "@/server/content/slug";

const PUBLIC_CONTENT_SELECT = {
  id: true,
  slug: true,
  type: true,
  format: true,
  title: true,
  subtitle: true,
  coverImageUrl: true,
  durationSeconds: true,
  publishedAt: true,
  liveStartAt: true,
  liveEndAt: true,
  location: true,
  isPurchasable: true,
  isFree: true,
  standalonePriceCents: true,
  subscriberPriceCentsOverride: true,
  maxSeats: true,
  seatsTaken: true,
  tags: true,
  isFeatured: true,
  author: { select: { id: true, fullName: true, slug: true, portraitUrl: true } },
} as const;

export const contentRouter = createTRPCRouter({
  list: adminProcedure
    .input(contentListInputSchema)
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.contentItem.findMany({
        where: {
          type: input.type,
          format: input.format,
          status: input.status,
          authorId: input.authorId,
          isPurchasable: input.isPurchasable,
          ...(input.search
            ? {
                OR: [
                  { title: { contains: input.search, mode: "insensitive" } },
                  { subtitle: { contains: input.search, mode: "insensitive" } },
                  { slug: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        select: {
          id: true,
          title: true,
          subtitle: true,
          slug: true,
          type: true,
          format: true,
          status: true,
          coverImageUrl: true,
          publishedAt: true,
          liveStartAt: true,
          isPurchasable: true,
          standalonePriceCents: true,
          maxSeats: true,
          seatsTaken: true,
          updatedAt: true,
          author: { select: { id: true, fullName: true, slug: true } },
        },
      });
      const nextCursor = items.length > input.limit ? items[input.limit]?.id : null;
      return { items: items.slice(0, input.limit), nextCursor };
    }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.contentItem.findUnique({
        where: { id: input.id },
        include: {
          author: { select: { id: true, fullName: true, slug: true } },
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              lessons: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return item;
    }),

  upsert: adminProcedure
    .input(contentUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const slugSource = input.slug?.trim() || toSlug(input.title);
      const slug = await ensureUniqueContentSlug(ctx.db, slugSource, input.id);

      const data = {
        title: input.title,
        subtitle: input.subtitle ?? null,
        slug,
        type: input.type,
        format: input.format,
        descriptionMd: input.descriptionMd ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        authorId: input.authorId ?? null,
        vimeoVideoId: input.vimeoVideoId ?? null,
        durationSeconds: input.durationSeconds,
        tags: input.tags,
        isFeatured: input.isFeatured,
        isFree: input.isFree,

        liveStartAt: input.liveStartAt ?? null,
        liveEndAt: input.liveEndAt ?? null,
        registrationDeadlineAt: input.registrationDeadlineAt ?? null,
        timezone: input.timezone,
        location: input.location ?? null,

        isPurchasable: input.isPurchasable,
        standalonePriceCents: input.standalonePriceCents ?? null,
        subscriberPriceCentsOverride: input.subscriberPriceCentsOverride ?? null,

        maxSeats: input.maxSeats ?? null,

        status: input.status,
        scheduledPublishAt: input.scheduledPublishAt ?? null,
        publishedAt:
          input.status === "published"
            ? new Date()
            : input.status === "archived"
              ? undefined
              : null,
      };

      const row = input.id
        ? await ctx.db.contentItem.update({
            where: { id: input.id },
            data,
            select: { id: true, slug: true },
          })
        : await ctx.db.contentItem.create({
            data,
            select: { id: true, slug: true },
          });

      await ctx.db.auditLog.create({
        data: {
          actorUserId: ctx.user.id,
          action: input.id ? "content.update" : "content.create",
          entityType: "content_item",
          entityId: row.id,
        },
      });

      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Soft-delete: mark as archived so historical FK remain valid.
      await ctx.db.contentItem.update({
        where: { id: input.id },
        data: { status: "archived" },
      });
      await ctx.db.auditLog.create({
        data: {
          actorUserId: ctx.user.id,
          action: "content.archive",
          entityType: "content_item",
          entityId: input.id,
        },
      });
      return { ok: true };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["draft", "scheduled", "published", "archived"]),
        scheduledPublishAt: z.coerce.date().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: {
        status: "draft" | "scheduled" | "published" | "archived";
        scheduledPublishAt: Date | null;
        publishedAt?: Date | null;
      } = {
        status: input.status,
        scheduledPublishAt: input.scheduledPublishAt ?? null,
      };
      if (input.status === "published") data.publishedAt = new Date();
      if (input.status === "draft") data.publishedAt = null;
      await ctx.db.contentItem.update({ where: { id: input.id }, data });
      return { ok: true };
    }),

  // --------------------------------------------------------------------------
  // Course modules + lessons
  // --------------------------------------------------------------------------
  upsertModule: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        courseId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        return ctx.db.courseModule.update({
          where: { id: input.id },
          data: { title: input.title },
          select: { id: true },
        });
      }
      const count = await ctx.db.courseModule.count({
        where: { courseId: input.courseId },
      });
      return ctx.db.courseModule.create({
        data: {
          courseId: input.courseId,
          title: input.title,
          orderIndex: count,
        },
        select: { id: true },
      });
    }),

  deleteModule: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.courseModule.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  reorderModules: adminProcedure
    .input(
      z.object({
        courseId: z.string().uuid(),
        orderedIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.courseModule.update({
            where: { id },
            data: { orderIndex: index },
          }),
        ),
      );
      return { ok: true };
    }),

  upsertLesson: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        moduleId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        vimeoVideoId: z
          .string()
          .trim()
          .regex(/^\d+$/, "Solo l'ID numerico Vimeo")
          .optional()
          .or(z.literal("")),
        durationSeconds: z.coerce.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const vimeo = input.vimeoVideoId && input.vimeoVideoId.length > 0
        ? input.vimeoVideoId
        : null;
      if (input.id) {
        return ctx.db.courseLesson.update({
          where: { id: input.id },
          data: {
            title: input.title,
            vimeoVideoId: vimeo ?? "",
            durationSeconds: input.durationSeconds,
          },
          select: { id: true },
        });
      }
      const count = await ctx.db.courseLesson.count({
        where: { moduleId: input.moduleId },
      });
      return ctx.db.courseLesson.create({
        data: {
          moduleId: input.moduleId,
          title: input.title,
          vimeoVideoId: vimeo ?? "",
          durationSeconds: input.durationSeconds,
          orderIndex: count,
        },
        select: { id: true },
      });
    }),

  deleteLesson: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.courseLesson.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  reorderLessons: adminProcedure
    .input(
      z.object({
        moduleId: z.string().uuid(),
        orderedIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.courseLesson.update({
            where: { id },
            data: { orderIndex: index },
          }),
        ),
      );
      return { ok: true };
    }),

  // --------------------------------------------------------------------------
  // PUBLIC procedures (consumed by /catalogo, /[tipo], /[tipo]/[slug], etc.)
  // Filter to status='published' only; never expose drafts/archived.
  // --------------------------------------------------------------------------

  publicHome: publicProcedure.query(async ({ ctx }) => {
    const baseWhere = { status: "published" as const };
    const [featured, latest, lectures, corsi, documentari, masterclass, workshops] =
      await Promise.all([
        ctx.db.contentItem.findFirst({
          where: { ...baseWhere, isFeatured: true },
          orderBy: { publishedAt: "desc" },
          select: PUBLIC_CONTENT_SELECT,
        }),
        ctx.db.contentItem.findMany({
          where: baseWhere,
          orderBy: { publishedAt: "desc" },
          take: 8,
          select: PUBLIC_CONTENT_SELECT,
        }),
        ctx.db.contentItem.findMany({
          where: { ...baseWhere, type: "lecture" },
          orderBy: { publishedAt: "desc" },
          take: 6,
          select: PUBLIC_CONTENT_SELECT,
        }),
        ctx.db.contentItem.findMany({
          where: { ...baseWhere, type: "corso" },
          orderBy: { publishedAt: "desc" },
          take: 6,
          select: PUBLIC_CONTENT_SELECT,
        }),
        ctx.db.contentItem.findMany({
          where: { ...baseWhere, type: "documentario" },
          orderBy: { publishedAt: "desc" },
          take: 6,
          select: PUBLIC_CONTENT_SELECT,
        }),
        ctx.db.contentItem.findMany({
          where: { ...baseWhere, type: "masterclass" },
          orderBy: [{ liveStartAt: "asc" }, { publishedAt: "desc" }],
          take: 6,
          select: PUBLIC_CONTENT_SELECT,
        }),
        ctx.db.contentItem.findMany({
          where: { ...baseWhere, type: "workshop" },
          orderBy: [{ liveStartAt: "asc" }, { publishedAt: "desc" }],
          take: 6,
          select: PUBLIC_CONTENT_SELECT,
        }),
      ]);
    return { featured, latest, lectures, corsi, documentari, masterclass, workshops };
  }),

  publicByType: publicProcedure
    .input(
      z.object({
        type: contentTypeEnum,
        format: contentFormatEnum.optional(),
        authorId: z.string().uuid().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(24),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.contentItem.findMany({
        where: {
          status: "published",
          type: input.type,
          format: input.format,
          authorId: input.authorId,
        },
        orderBy:
          input.type === "masterclass" || input.type === "workshop"
            ? [{ liveStartAt: "asc" }, { publishedAt: "desc" }]
            : { publishedAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        select: PUBLIC_CONTENT_SELECT,
      });
      const nextCursor = items.length > input.limit ? items[input.limit]?.id : null;
      return { items: items.slice(0, input.limit), nextCursor };
    }),

  publicGetBySlug: publicProcedure
    .input(z.object({ type: contentTypeEnum, slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.contentItem.findFirst({
        where: { slug: input.slug, type: input.type, status: "published" },
        select: {
          ...PUBLIC_CONTENT_SELECT,
          descriptionMd: true,
          vimeoVideoId: true,
          timezone: true,
          registrationDeadlineAt: true,
          modules: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              title: true,
              orderIndex: true,
              lessons: {
                orderBy: { orderIndex: "asc" },
                select: {
                  id: true,
                  title: true,
                  durationSeconds: true,
                  orderIndex: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              slug: true,
              fullName: true,
              bioMd: true,
              portraitUrl: true,
              websiteUrl: true,
            },
          },
        },
      });
      if (!item) return null;

      // Related: same author OR overlapping tag
      const related = await ctx.db.contentItem.findMany({
        where: {
          status: "published",
          id: { not: item.id },
          OR: [
            item.author?.id ? { authorId: item.author.id } : { id: undefined },
            item.tags.length > 0 ? { tags: { hasSome: item.tags } } : { id: undefined },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 4,
        select: PUBLIC_CONTENT_SELECT,
      });

      return { item, related };
    }),

  publicSearch: publicProcedure
    .input(z.object({ q: z.string().trim().min(2).max(120) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contentItem.findMany({
        where: {
          status: "published",
          OR: [
            { title: { contains: input.q, mode: "insensitive" } },
            { subtitle: { contains: input.q, mode: "insensitive" } },
            { tags: { has: input.q.toLowerCase() } },
            {
              author: {
                fullName: { contains: input.q, mode: "insensitive" },
              },
            },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 30,
        select: PUBLIC_CONTENT_SELECT,
      });
    }),

  publicAll: publicProcedure.query(async ({ ctx }) => {
    // For sitemap.xml — minimal fields, all published items
    return ctx.db.contentItem.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      select: { type: true, slug: true, updatedAt: true },
    });
  }),
});
