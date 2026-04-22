import type { PrismaClient } from "@prisma/client";
import { toSlug } from "@/lib/slug";

export { toSlug };

/**
 * Ensure the slug is unique across content_items, appending -2, -3, ... as needed.
 * If `excludeId` is provided (edit flow), that row is ignored from the check.
 */
export async function ensureUniqueContentSlug(
  db: PrismaClient,
  base: string,
  excludeId?: string,
): Promise<string> {
  const normalized = toSlug(base);
  let candidate = normalized;
  let suffix = 1;

  for (let i = 0; i < 50; i++) {
    const existing = await db.contentItem.findFirst({
      where: {
        slug: candidate,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${normalized}-${suffix}`;
  }
  throw new Error("Could not generate unique slug");
}

export async function ensureUniqueAuthorSlug(
  db: PrismaClient,
  base: string,
  excludeId?: string,
): Promise<string> {
  const normalized = toSlug(base);
  let candidate = normalized;
  let suffix = 1;
  for (let i = 0; i < 50; i++) {
    const existing = await db.author.findFirst({
      where: {
        slug: candidate,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${normalized}-${suffix}`;
  }
  throw new Error("Could not generate unique slug");
}
