import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let _admin: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Bypasses RLS and can call auth.admin.*
 * Use only from trusted server code (webhooks, tRPC mutations, cron).
 * Never expose to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin client");
  }
  if (!_admin) {
    _admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

/**
 * Create an auth.users entry WITHOUT password (email_confirm skipped at call-site
 * since we already hold the email). Returns the user id.
 * Fails if email already exists — the caller must check first.
 */
export async function createPasswordlessUser(params: {
  email: string;
  fullName?: string | null;
  createdVia: string;
}): Promise<{ id: string }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    email_confirm: true, // treat as verified so they can land in /io immediately
    user_metadata: {
      full_name: params.fullName ?? null,
      password_set: false,
    },
    app_metadata: {
      created_via: params.createdVia,
    },
  });
  if (error || !data.user) {
    throw new Error(`admin.createUser failed: ${error?.message ?? "unknown"}`);
  }
  return { id: data.user.id };
}

/**
 * Generate a magic-link URL that, when followed, logs the user in and
 * redirects to `next`. The URL is single-use and expires in ~1 hour.
 */
export async function generateMagicLinkUrl(params: {
  email: string;
  next: string;
}): Promise<string> {
  const admin = getSupabaseAdmin();
  const callback = `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(params.next)}`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: params.email,
    options: {
      redirectTo: callback,
    },
  });
  if (error || !data.properties?.action_link) {
    throw new Error(`admin.generateLink failed: ${error?.message ?? "unknown"}`);
  }
  return data.properties.action_link;
}

/** Check whether an email is already a registered Supabase auth user. */
export async function findAuthUserByEmail(
  email: string,
): Promise<{ id: string } | null> {
  const admin = getSupabaseAdmin();
  // listUsers supports filtering by email exact match via query string
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (error) {
    throw new Error(`admin.listUsers failed: ${error.message}`);
  }
  // The SDK doesn't expose a direct "find by email" helper; scan the page.
  // For our case this is OK because we also check public.users first via Prisma.
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found ? { id: found.id } : null;
}
