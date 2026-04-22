import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Returns the authorized Vimeo ID for a content item.
 * Full implementation in Sprint 5 (PRD §6.3):
 *   1. Verify user session
 *   2. Verify active subscription OR is_free content
 *   3. Return { vimeoId } — the iframe URL is built client-side
 */
export async function GET(_req: NextRequest, _ctx: { params: { id: string } }) {
  return NextResponse.json(
    { error: "Stream authorization not yet implemented" },
    { status: 501 },
  );
}
