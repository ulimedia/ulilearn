import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../init";
import { getSiteSettings } from "@/server/billing/settings";

export const settingsRouter = createTRPCRouter({
  /** Public: any client can read the global discount (used in storefront UI). */
  publicGet: publicProcedure.query(async ({ ctx }) => {
    const s = await getSiteSettings(ctx.db);
    return { subscriberDiscountPercent: s.subscriberDiscountPercent };
  }),

  /** Admin: full settings row. */
  get: adminProcedure.query(async ({ ctx }) => {
    return getSiteSettings(ctx.db);
  }),

  update: adminProcedure
    .input(
      z.object({
        subscriberDiscountPercent: z.number().int().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Make sure the singleton exists, then update by primary key.
      await getSiteSettings(ctx.db);
      return ctx.db.siteSettings.update({
        where: { id: 1 },
        data: { subscriberDiscountPercent: input.subscriberDiscountPercent },
      });
    }),
});
