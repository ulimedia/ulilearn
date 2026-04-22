import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Resend webhook handler not yet implemented" },
    { status: 501 },
  );
}
