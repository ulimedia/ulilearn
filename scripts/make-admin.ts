/**
 * One-shot: create (or upgrade) an admin user and print a magic link.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   pnpm tsx scripts/make-admin.ts hello@alessandropiazza.it
 *
 * What it does:
 *   1. Look up the user in auth.users; create it (passwordless, email_confirmed)
 *      if missing.
 *   2. Set app_metadata.role = "admin" (consumed by middleware + is_admin() SQL).
 *   3. Update public.users.role = "admin" (consumed by adminProcedure tRPC).
 *   4. Generate a single-use magic link that lands on /admin.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ulilearn.vercel.app";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  throw new Error("usage: tsx scripts/make-admin.ts <email>");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // 1. Find or create auth.users row
  console.log(`Looking up ${email}…`);
  const { data: page, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;

  let user = page.users.find((u) => u.email?.toLowerCase() === email);

  if (!user) {
    console.log("Not found, creating…");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { role: "admin", created_via: "admin_script" },
      user_metadata: { password_set: false },
    });
    if (error) throw error;
    user = data.user;
    if (!user) throw new Error("create returned no user");
    // Give trigger a beat to populate public.users
    await new Promise((r) => setTimeout(r, 400));
  } else {
    console.log(`Found user ${user.id}. Upgrading app_metadata.role=admin…`);
    const merged = { ...(user.app_metadata ?? {}), role: "admin" };
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: merged,
    });
    if (error) throw error;
  }

  // 2. Update public.users.role
  console.log("Setting public.users.role = admin…");
  const { error: updErr } = await supabase
    .from("users")
    .update({ role: "admin" })
    .eq("id", user.id);
  if (updErr) {
    // If the public.users row doesn't exist (trigger slow), upsert it
    console.warn(`update failed: ${updErr.message}; trying upsert…`);
    const { error: upErr } = await supabase.from("users").upsert({
      id: user.id,
      email,
      role: "admin",
      auth_provider: "email",
    });
    if (upErr) throw upErr;
  }

  // 3. Generate magic link
  console.log("Generating magic link…");
  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${APP_URL}/auth/callback?next=/admin`,
    },
  });
  if (linkErr) throw linkErr;

  console.log("\n================================================");
  console.log(`Admin user: ${email}`);
  console.log(`User id:    ${user.id}`);
  console.log(`Login:      ${link.properties?.action_link}`);
  console.log("================================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
