import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const authRouter = createTRPCRouter({
  /** Returns the current session user or null. Safe to call unauthenticated. */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const profile = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        marketingConsent: true,
      },
    });
    return profile;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(1).max(120).optional(),
        marketingConsent: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: { id: true, fullName: true, marketingConsent: true },
      });
    }),
});
