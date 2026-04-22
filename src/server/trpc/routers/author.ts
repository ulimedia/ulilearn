import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../init";
import { authorUpsertSchema } from "@/server/content/schemas";
import { ensureUniqueAuthorSlug, toSlug } from "@/server/content/slug";

export const authorRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().trim().max(200).optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.author.findMany({
        where: input.search
          ? {
              OR: [
                { fullName: { contains: input.search, mode: "insensitive" } },
                { slug: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { fullName: "asc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        select: {
          id: true,
          fullName: true,
          slug: true,
          portraitUrl: true,
          _count: { select: { contentItems: true } },
        },
      });
      const nextCursor = items.length > input.limit ? items[input.limit]?.id : null;
      return { items: items.slice(0, input.limit), nextCursor };
    }),

  listMini: adminProcedure
    .input(z.object({ search: z.string().trim().max(200).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.author.findMany({
        where: input.search
          ? { fullName: { contains: input.search, mode: "insensitive" } }
          : undefined,
        orderBy: { fullName: "asc" },
        take: 50,
        select: { id: true, fullName: true, slug: true },
      });
    }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const author = await ctx.db.author.findUnique({ where: { id: input.id } });
      if (!author) throw new TRPCError({ code: "NOT_FOUND" });
      return author;
    }),

  upsert: adminProcedure
    .input(authorUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const slugSource = input.slug?.trim() || toSlug(input.fullName);
      const slug = await ensureUniqueAuthorSlug(ctx.db, slugSource, input.id);

      const data = {
        fullName: input.fullName,
        slug,
        bioMd: input.bioMd ?? null,
        portraitUrl: input.portraitUrl ?? null,
        websiteUrl: input.websiteUrl ?? null,
        socialLinks: input.socialLinks ?? undefined,
      };

      const row = input.id
        ? await ctx.db.author.update({
            where: { id: input.id },
            data,
            select: { id: true, slug: true },
          })
        : await ctx.db.author.create({ data, select: { id: true, slug: true } });

      await ctx.db.auditLog.create({
        data: {
          actorUserId: ctx.user.id,
          action: input.id ? "author.update" : "author.create",
          entityType: "author",
          entityId: row.id,
        },
      });
      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.contentItem.count({
        where: { authorId: input.id },
      });
      if (count > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Impossibile cancellare: l'autore ha ${count} contenuti associati.`,
        });
      }
      await ctx.db.author.delete({ where: { id: input.id } });
      await ctx.db.auditLog.create({
        data: {
          actorUserId: ctx.user.id,
          action: "author.delete",
          entityType: "author",
          entityId: input.id,
        },
      });
      return { ok: true };
    }),

  // --------------------------------------------------------------------------
  // PUBLIC procedures
  // --------------------------------------------------------------------------

  publicList: publicProcedure
    .input(z.object({ search: z.string().trim().max(120).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const search = input?.search;
      return ctx.db.author.findMany({
        where: {
          contentItems: { some: { status: "published" } },
          ...(search
            ? { fullName: { contains: search, mode: "insensitive" } }
            : {}),
        },
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          slug: true,
          fullName: true,
          portraitUrl: true,
          _count: { select: { contentItems: true } },
        },
      });
    }),

  publicGetBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const author = await ctx.db.author.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          slug: true,
          fullName: true,
          bioMd: true,
          portraitUrl: true,
          websiteUrl: true,
          socialLinks: true,
          contentItems: {
            where: { status: "published" },
            orderBy: { publishedAt: "desc" },
            select: {
              id: true,
              slug: true,
              type: true,
              title: true,
              subtitle: true,
              coverImageUrl: true,
              publishedAt: true,
              liveStartAt: true,
              durationSeconds: true,
              isPurchasable: true,
            },
          },
        },
      });
      return author;
    }),
});
