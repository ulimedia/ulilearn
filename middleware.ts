import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_REQUIRED = [/^\/io(\/|$)/, /^\/watch(\/|$)/, /^\/checkout(\/|$)/];
const ADMIN_REQUIRED = [/^\/admin(\/|$)/];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const needsAuth = AUTH_REQUIRED.some((r) => r.test(pathname));
  const needsAdmin = ADMIN_REQUIRED.some((r) => r.test(pathname));

  if ((needsAuth || needsAdmin) && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  if (needsAdmin && user) {
    const role = (user.app_metadata?.role as string | undefined) ?? "user";
    if (role !== "admin" && role !== "editor") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run middleware on all paths except static assets and API webhooks
    // (webhooks need raw body; do NOT touch them here).
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|public/).*)",
  ],
};
