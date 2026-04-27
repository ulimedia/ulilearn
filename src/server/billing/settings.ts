import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";

/**
 * Returns the singleton site settings row (id=1), creating it with defaults
 * if it doesn't exist yet. Always succeeds.
 */
export async function getSiteSettings(db: PrismaClient = prisma) {
  let row = await db.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await db.siteSettings.create({
      data: { id: 1 },
    });
  }
  return row;
}
