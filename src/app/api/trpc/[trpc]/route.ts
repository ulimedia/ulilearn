import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTRPCContext } from "@/server/trpc/context";

// The leadMagnet.analyze procedure does Apify scrape (10-30s) + Claude vision
// call (10-25s). Total can reach 40-50s on the tail; give it 90s headroom.
// Vercel Hobby caps at 60s, Pro goes up to 900s — lift safely.
export const maxDuration = 90;
export const runtime = "nodejs";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`tRPC ${path} internal error:`, error);
      }
    },
  });

export { handler as GET, handler as POST };
