import { env } from "@/lib/env";

/**
 * Verify a Cloudflare Turnstile token server-side.
 *
 * Behavior by environment:
 * - If TURNSTILE_SECRET_KEY is configured → always verify via Cloudflare API.
 * - If missing (dev OR prod) → return true with a warning log. This is an
 *   intentional "disabled" mode so the feature works before Turnstile is
 *   set up; rate limiting (IP + email + budget) is the fallback protection.
 *
 * To re-enable strict mode in prod, set TURNSTILE_SECRET_KEY and the client
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.warn(
      "[turnstile] disabled (no secret key configured). Relying on rate limit + budget cap.",
    );
    return true;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
    });
    if (ip) body.append("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        // 5s timeout via AbortSignal
        signal: AbortSignal.timeout(5000),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] verification failed", e);
    return false;
  }
}
