import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/client";
import { env } from "@/lib/env";

// Always run on the server at request time — DB is not reachable at build.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const [contents, authors] = await Promise.all([
    prisma.contentItem.findMany({
      where: { status: "published" },
      select: { type: true, slug: true, updatedAt: true },
    }),
    prisma.author.findMany({
      where: { contentItems: { some: { status: "published" } } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/catalogo",
    "/lecture",
    "/corsi",
    "/documentari",
    "/masterclass",
    "/workshop",
    "/autori",
    "/abbonati",
    "/scopri-autori",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  const contentRoutes: MetadataRoute.Sitemap = contents.map((c) => ({
    url: `${base}/${c.type}/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const authorRoutes: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${base}/autori/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...contentRoutes, ...authorRoutes];
}
