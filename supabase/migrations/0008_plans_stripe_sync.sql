-- ============================================================================
-- Ulilearn — Block 3 step 1/1: Plan ↔ Stripe sync support.
--
-- Adds presentation columns (description, feature bullets, sort_order) and
-- the missing stripe_product_id field to public.plans, so the admin CRUD in
-- /admin/piani can sync each Plan with a Stripe Product + Price.
--
-- Idempotent: safe to run any number of times.
-- ============================================================================

alter table "public"."plans"
  add column if not exists "description"        text,
  add column if not exists "feature_bullets"    text[] not null default '{}',
  add column if not exists "sort_order"         integer not null default 0,
  add column if not exists "stripe_product_id"  text;

create index if not exists "plans_is_active_sort_order_idx"
  on "public"."plans" ("is_active", "sort_order");
