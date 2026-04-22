import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Vercel Cron — flips content_items from `scheduled` to `published` once
 * `scheduledPublishAt` has passed. Configured in vercel.json to run every
 * 10 minutes. Vercel injects an Authorization header with the CRON_SECRET
 * env var (set automatically when adding a cron via vercel.json).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await prisma.contentItem.updateMany({
    where: {
      status: "scheduled",
      scheduledPublishAt: { lte: now },
    },
    data: {
      status: "published",
      publishedAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    publishedCount: result.count,
    runAt: now.toISOString(),
  });
}
