import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTRPCContext } from "@/server/trpc/context";

// The leadMagnet.analyze procedure calls Claude; it can take 15-30s.
// Vercel Pro/Hobby default is 10s on Node runtime — lift it to 60s.
export const maxDuration = 60;
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
