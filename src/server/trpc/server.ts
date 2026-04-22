import { cache } from "react";
import { createCaller } from "./routers/_app";
import { getServerContext } from "./context";

/**
 * Use this in Server Components to call tRPC procedures directly without HTTP.
 *
 *   const api = await getApi();
 *   const home = await api.content.publicHome();
 */
export const getApi = cache(async () => {
  const ctx = await getServerContext();
  return createCaller(ctx);
});
