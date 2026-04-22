import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Public procedure — no auth required. */
export const publicProcedure = t.procedure;

/** Authenticated procedure — requires a logged-in Supabase user. */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Admin-only procedure — requires role ∈ (admin, editor) on the public.users row. */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const row = await ctx.db.user.findUnique({
    where: { id: ctx.user.id },
    select: { role: true },
  });
  if (!row || (row.role !== "admin" && row.role !== "editor")) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, role: row.role } });
});
