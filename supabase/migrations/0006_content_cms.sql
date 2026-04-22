-- ============================================================================
-- Ulilearn — Block 1 step 2/2: Content CMS schema
--
-- Run AFTER 0005_content_types.sql (new enum values must be committed first).
-- Adds content_format + purchase_status enums, extends content_items with
-- live-event/pricing/seats fields, creates content_purchases table with RLS,
-- adds subscriber_discount_percent on plans.
-- ============================================================================

-- New enums
do $$ begin
  create type "content_format" as enum ('on_demand', 'live_online', 'live_hybrid', 'live_in_person');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "purchase_status" as enum ('pending', 'paid', 'refunded', 'canceled');
exception when duplicate_object then null;
end $$;

-- Extend content_items
alter table "public"."content_items"
  add column if not exists "format" "content_format" not null default 'on_demand',
  add column if not exists "live_start_at" timestamptz,
  add column if not exists "live_end_at" timestamptz,
  add column if not exists "registration_deadline_at" timestamptz,
  add column if not exists "timezone" text default 'Europe/Rome',
  add column if not exists "location" text,
  add column if not exists "is_purchasable" boolean not null default false,
  add column if not exists "standalone_price_cents" integer,
  add column if not exists "subscriber_price_cents_override" integer,
  add column if not exists "max_seats" integer,
  add column if not exists "seats_taken" integer not null default 0,
  add column if not exists "scheduled_publish_at" timestamptz;

-- Indexes
create index if not exists "content_items_type_live_start_at_idx"
  on "public"."content_items" ("type", "live_start_at");
create index if not exists "content_items_is_purchasable_status_idx"
  on "public"."content_items" ("is_purchasable", "status");
create index if not exists "content_items_title_trgm_idx"
  on "public"."content_items" using gin ("title" gin_trgm_ops);

-- Plan: subscriber discount percent
alter table "public"."plans"
  add column if not exists "subscriber_discount_percent" integer not null default 20;

-- Backfill: existing masterclass/workshop rows (if any) become purchasable
update "public"."content_items"
  set "is_purchasable" = true
  where "type" in ('masterclass', 'workshop') and "is_purchasable" = false;

-- content_purchases table
create table if not exists "public"."content_purchases" (
  "id"                        uuid primary key default gen_random_uuid(),
  "user_id"                   uuid not null,
  "content_item_id"           uuid not null,
  "amount_paid_cents"         integer not null,
  "currency"                  char(3) not null default 'EUR',
  "provider"                  "payment_provider" not null,
  "provider_payment_id"       text not null,
  "status"                    "purchase_status" not null default 'pending',
  "applied_discount_percent"  integer,
  "was_subscriber"            boolean not null default false,
  "coupon_id"                 uuid,
  "seat_confirmed"            boolean not null default false,
  "access_expires_at"         timestamptz,
  "created_at"                timestamptz not null default now(),
  "updated_at"                timestamptz not null default now()
);

do $$ begin
  alter table "public"."content_purchases"
    add constraint "content_purchases_user_id_fkey"
    foreign key ("user_id") references "public"."users"("id") on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table "public"."content_purchases"
    add constraint "content_purchases_content_item_id_fkey"
    foreign key ("content_item_id") references "public"."content_items"("id") on delete restrict;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table "public"."content_purchases"
    add constraint "content_purchases_coupon_id_fkey"
    foreign key ("coupon_id") references "public"."coupons"("id") on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table "public"."content_purchases"
    add constraint "content_purchases_user_content_unique"
    unique ("user_id", "content_item_id");
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table "public"."content_purchases"
    add constraint "content_purchases_provider_payment_unique"
    unique ("provider", "provider_payment_id");
exception when duplicate_object then null;
end $$;

create index if not exists "content_purchases_content_item_status_idx"
  on "public"."content_purchases" ("content_item_id", "status");

-- RLS on content_purchases
alter table "public"."content_purchases" enable row level security;

drop policy if exists "content_purchases: owner read" on "public"."content_purchases";
create policy "content_purchases: owner read"
  on "public"."content_purchases" for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "content_purchases: admin full" on "public"."content_purchases";
create policy "content_purchases: admin full"
  on "public"."content_purchases" for all
  using (public.is_admin())
  with check (public.is_admin());
