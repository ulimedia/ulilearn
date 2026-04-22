import { createCallerFactory, createTRPCRouter } from "../init";
import { authRouter } from "./auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  // content, author, subscription, coupon, progress, saved, admin, analytics
  // will be added in their respective sprints.
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
