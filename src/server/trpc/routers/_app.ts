import { createCallerFactory, createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { leadMagnetRouter } from "./leadMagnet";
import { contentRouter } from "./content";
import { authorRouter } from "./author";
import { mediaRouter } from "./media";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  leadMagnet: leadMagnetRouter,
  content: contentRouter,
  author: authorRouter,
  media: mediaRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
