-- ============================================================================
-- Ulilearn — Block 3.5: explicit Plan ↔ Content relationship + SiteSettings.
--
-- Replaces the implicit "by ContentType" rule (lecture/corso/documentario =
-- always in Plus) with an explicit list per plan, so admins can choose what
-- each subscription plan includes. Also moves the global subscriber discount
-- out of `plans` and into a new singleton `site_settings` row.
--
-- Idempotent: safe to run any number of times.
-- ============================================================================

-- 1. Singleton site settings table.
create table if not exists "public"."site_settings" (
  "id"                          integer     primary key default 1,
  "subscriber_discount_percent" integer     not null default 20,
  "created_at"                  timestamptz not null default now(),
  "updated_at"                  timestamptz not null default now(),
  constraint "site_settings_singleton" check ("id" = 1)
);

-- Seed the singleton row, copying the highest discount we have on plans
-- (the value the admin already configured) — fallback 20.
insert into "public"."site_settings" ("id", "subscriber_discount_percent")
select 1, coalesce(
  (select max("subscriber_discount_percent") from "public"."plans" where "is_active" = true),
  20
)
on conflict ("id") do nothing;

-- 2. Plan ↔ ContentItem join table.
create table if not exists "public"."plan_contents" (
  "plan_id"         uuid        not null,
  "content_item_id" uuid        not null,
  "added_at"        timestamptz not null default now(),
  primary key ("plan_id", "content_item_id"),
  constraint "plan_contents_plan_id_fkey"
    foreign key ("plan_id") references "public"."plans" ("id") on delete cascade,
  constraint "plan_contents_content_item_id_fkey"
    foreign key ("content_item_id") references "public"."content_items" ("id") on delete cascade
);

create index if not exists "plan_contents_content_item_id_idx"
  on "public"."plan_contents" ("content_item_id");

-- 3. Backfill: link every published on-demand content (lecture/corso/documentario)
--    to every active plan. Mirrors the previous implicit behavior so nothing
--    breaks for users mid-flight after the migration.
insert into "public"."plan_contents" ("plan_id", "content_item_id")
select p."id", c."id"
from "public"."plans" p
cross join "public"."content_items" c
where p."is_active" = true
  and c."type" in ('lecture', 'corso', 'documentario')
  and c."status" = 'published'
on conflict do nothing;
