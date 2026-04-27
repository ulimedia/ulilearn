import { createCallerFactory, createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { leadMagnetRouter } from "./leadMagnet";
import { contentRouter } from "./content";
import { authorRouter } from "./author";
import { mediaRouter } from "./media";
import { planRouter } from "./plan";
import { subscriptionRouter } from "./subscription";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  leadMagnet: leadMagnetRouter,
  content: contentRouter,
  author: authorRouter,
  media: mediaRouter,
  plan: planRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
