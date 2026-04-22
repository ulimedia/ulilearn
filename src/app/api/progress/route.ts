import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Viewing progress upsert — called from VimeoPlayer on `timeupdate`,
 * throttled to 10s (see PROGRESS_SAVE_THROTTLE_MS).
 * Full implementation in Sprint 5 (PRD §6.3 #4).
 */
export async function POST() {
  return NextResponse.json(
    { error: "Progress endpoint not yet implemented" },
    { status: 501 },
  );
}
