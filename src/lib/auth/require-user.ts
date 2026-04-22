import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db/client";

/**
 * Server-side guard for pages/layouts that require an authenticated user.
 * Redirects to /login with a `next` query preserving the intended path.
 */
export async function requireUser(nextPath?: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const search = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${search}`);
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, fullName: true, role: true, avatarUrl: true },
  });

  if (!profile) {
    redirect("/login");
  }

  return { authUser: user, profile };
}
