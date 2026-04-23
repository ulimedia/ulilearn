import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser Supabase client.
 *
 * We use `flowType: "implicit"` so that `signInWithOtp` (magic link from
 * `/login`) returns tokens in the URL hash fragment instead of the PKCE
 * `?code=` flow. PKCE requires a `code_verifier` cookie to be present in
 * the exact same browser that requested the link, which breaks every time
 * the user opens the email on a different device (e.g. requests the link
 * on desktop, clicks it from their phone's mail app). Implicit flow makes
 * the magic link portable across devices — tokens live in the URL, not
 * in browser storage.
 *
 * Consistency bonus: the lead magnet (admin `generateLink`) also emits
 * implicit-flow URLs, so now both auth entry points behave the same.
 * `src/app/auth/callback/page.tsx` already handles the hash fragment.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { flowType: "implicit" },
    },
  );
}
