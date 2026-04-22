import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db/client";

export async function createTRPCContext(_opts: { headers: Headers }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    db: prisma,
    supabase,
    user,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

export const getServerContext = cache(async () =>
  createTRPCContext({ headers: new Headers() }),
);
