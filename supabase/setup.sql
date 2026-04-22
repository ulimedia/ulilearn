-- ============================================================================
-- Ulilearn — complete setup bundle
-- Run once in Supabase SQL Editor to initialize everything:
--   1. Tables (from Prisma schema, includes leads)
--   2. RLS policies + triggers
--   3. Storage buckets
--   4. Leads RLS + auth conversion trigger
-- ============================================================================

-- ==== 1. TABLES ====

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin', 'editor');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('email', 'google');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "billing_interval" AS ENUM ('year', 'month');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('stripe', 'paypal');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('succeeded', 'refunded', 'failed', 'pending');

-- CreateEnum
CREATE TYPE "coupon_type" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "coupon_applies_to" AS ENUM ('first_payment', 'all');

-- CreateEnum
CREATE TYPE "content_type" AS ENUM ('lecture', 'corso', 'documentario');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- CreateEnum
CREATE TYPE "email_status" AS ENUM ('sent', 'delivered', 'bounced', 'opened', 'clicked', 'failed');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('new', 'analyzed', 'emailed', 'converted', 'bounced');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "auth_provider" "auth_provider" NOT NULL DEFAULT 'email',
    "role" "user_role" NOT NULL DEFAULT 'user',
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "kajabi_legacy_id" TEXT,
    "migrated_from_kajabi" BOOLEAN NOT NULL DEFAULT false,
    "signup_source" TEXT,
    "signup_medium" TEXT,
    "signup_campaign" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "origin_lead_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "billing_interval" "billing_interval" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stripe_price_id" TEXT,
    "paypal_plan_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "subscription_status" NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "paypal_subscription_id" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "current_period_start" TIMESTAMPTZ NOT NULL,
    "current_period_end" TIMESTAMPTZ NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "provider" "payment_provider" NOT NULL,
    "provider_payment_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "payment_status" NOT NULL,
    "invoice_url" TEXT,
    "coupon_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "coupon_type" NOT NULL,
    "value" INTEGER NOT NULL,
    "max_redemptions" INTEGER,
    "redemptions_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMPTZ NOT NULL,
    "valid_until" TIMESTAMPTZ,
    "applicable_plan_ids" UUID[],
    "applies_to" "coupon_applies_to" NOT NULL DEFAULT 'first_payment',
    "stripe_coupon_id" TEXT,
    "stripe_promotion_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "bio_md" TEXT,
    "portrait_url" TEXT,
    "website_url" TEXT,
    "social_links" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "content_type" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description_md" TEXT,
    "cover_image_url" TEXT,
    "author_id" UUID,
    "vimeo_video_id" TEXT,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ,
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lessons" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "vimeo_video_id" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL,
    "resources" JSONB,

    CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content_item_id" UUID,
    "lesson_id" UUID,
    "seconds_watched" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "last_watched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewing_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_items" (
    "user_id" UUID NOT NULL,
    "content_item_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_items_pkey" PRIMARY KEY ("user_id","content_item_id")
);

-- CreateTable
CREATE TABLE "user_tags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "status" "email_status" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "event_name" TEXT NOT NULL,
    "properties" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "diff" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "instagram_url" TEXT NOT NULL,
    "instagram_handle" TEXT,
    "source" TEXT NOT NULL DEFAULT 'lead_magnet_ig',
    "status" "lead_status" NOT NULL DEFAULT 'new',
    "marketing_consent" BOOLEAN NOT NULL DEFAULT true,
    "analysis_json" JSONB,
    "analysis_model" TEXT,
    "analysis_tokens_in" INTEGER,
    "analysis_tokens_out" INTEGER,
    "analysis_cost_cents" INTEGER,
    "analysis_error" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "referrer_url" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "turnstile_verified" BOOLEAN NOT NULL DEFAULT false,
    "converted_user_id" UUID,
    "converted_at" TIMESTAMPTZ,
    "email_sent_at" TIMESTAMPTZ,
    "email_message_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_kajabi_legacy_id_idx" ON "users"("kajabi_legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paypal_subscription_id_key" ON "subscriptions"("paypal_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_items_slug_key" ON "content_items"("slug");

-- CreateIndex
CREATE INDEX "content_items_slug_idx" ON "content_items"("slug");

-- CreateIndex
CREATE INDEX "content_items_status_published_at_idx" ON "content_items"("status", "published_at");

-- CreateIndex
CREATE INDEX "content_items_type_status_idx" ON "content_items"("type", "status");

-- CreateIndex
CREATE INDEX "content_items_author_id_idx" ON "content_items"("author_id");

-- CreateIndex
CREATE INDEX "course_modules_course_id_order_index_idx" ON "course_modules"("course_id", "order_index");

-- CreateIndex
CREATE INDEX "course_lessons_module_id_order_index_idx" ON "course_lessons"("module_id", "order_index");

-- CreateIndex
CREATE INDEX "viewing_progress_user_id_last_watched_at_idx" ON "viewing_progress"("user_id", "last_watched_at");

-- CreateIndex
CREATE UNIQUE INDEX "viewing_progress_user_id_content_item_id_key" ON "viewing_progress"("user_id", "content_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "viewing_progress_user_id_lesson_id_key" ON "viewing_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "saved_items_user_id_saved_at_idx" ON "saved_items"("user_id", "saved_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_tags_user_id_tag_key" ON "user_tags"("user_id", "tag");

-- CreateIndex
CREATE INDEX "user_notes_user_id_created_at_idx" ON "user_notes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "email_events_user_id_created_at_idx" ON "email_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "email_events_email_idx" ON "email_events"("email");

-- CreateIndex
CREATE INDEX "analytics_events_event_name_created_at_idx" ON "analytics_events"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_created_at_idx" ON "analytics_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_created_at_idx" ON "audit_log"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_progress" ADD CONSTRAINT "viewing_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_progress" ADD CONSTRAINT "viewing_progress_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_progress" ADD CONSTRAINT "viewing_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_user_id_fkey" FOREIGN KEY ("converted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ==== 2. RLS POLICIES ====

-- ============================================================================
-- Ulilearn — Row Level Security policies
-- Run AFTER `prisma migrate` has created the tables.
-- ============================================================================
-- Strategy:
--   • public read on published content catalog (content_items, authors, course_*)
--   • user-owned rows: only the owner can select/insert/update
--   • admin role (claim "role: admin") bypasses restrictions on write
-- Supabase Auth users live in auth.users; our public.users row is keyed to the
-- same UUID via trigger on signup (see seed/trigger below).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: trigger to mirror auth.users → public.users
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, auth_provider, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    case when new.raw_app_meta_data->>'provider' = 'google' then 'google'::auth_provider else 'email'::auth_provider end,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- Helper: trigger to cascade deletes auth.users → public.users
-- ----------------------------------------------------------------------------

create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.users where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_auth_user_deleted();

-- ----------------------------------------------------------------------------
-- Helper: is_admin() based on JWT claim
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS on every user-scoped table
-- ----------------------------------------------------------------------------

alter table public.users              enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;
alter table public.viewing_progress   enable row level security;
alter table public.saved_items        enable row level security;
alter table public.email_events       enable row level security;
alter table public.user_tags          enable row level security;
alter table public.user_notes         enable row level security;
alter table public.analytics_events   enable row level security;
alter table public.audit_log          enable row level security;

-- Content tables: public readable, admin writable
alter table public.content_items      enable row level security;
alter table public.authors            enable row level security;
alter table public.course_modules     enable row level security;
alter table public.course_lessons     enable row level security;
alter table public.plans              enable row level security;
alter table public.coupons            enable row level security;
alter table public.stripe_events      enable row level security;

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------

create policy "users: self can read own row"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "users: self can update own row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users: admin full access"
  on public.users for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- subscriptions / payments: read-only for owner, mutations server-side only
-- ----------------------------------------------------------------------------

create policy "subscriptions: owner read"
  on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "payments: owner read"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- viewing_progress: owner read/write
-- ----------------------------------------------------------------------------

create policy "viewing_progress: owner select"
  on public.viewing_progress for select
  using (auth.uid() = user_id or public.is_admin());

create policy "viewing_progress: owner insert"
  on public.viewing_progress for insert
  with check (auth.uid() = user_id);

create policy "viewing_progress: owner update"
  on public.viewing_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- saved_items: owner read/write
-- ----------------------------------------------------------------------------

create policy "saved_items: owner select"
  on public.saved_items for select
  using (auth.uid() = user_id or public.is_admin());

create policy "saved_items: owner insert"
  on public.saved_items for insert
  with check (auth.uid() = user_id);

create policy "saved_items: owner delete"
  on public.saved_items for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- email_events: owner read, admin write
-- ----------------------------------------------------------------------------

create policy "email_events: owner read"
  on public.email_events for select
  using (auth.uid() = user_id or public.is_admin());

create policy "email_events: admin write"
  on public.email_events for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- user_tags / user_notes: admin only
-- ----------------------------------------------------------------------------

create policy "user_tags: admin full"
  on public.user_tags for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "user_notes: admin full"
  on public.user_notes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- analytics_events: owner insert (for client events), admin read
-- ----------------------------------------------------------------------------

create policy "analytics_events: self insert"
  on public.analytics_events for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "analytics_events: admin read"
  on public.analytics_events for select
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- audit_log: admin only
-- ----------------------------------------------------------------------------

create policy "audit_log: admin full"
  on public.audit_log for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Content catalog: public read of published, admin write
-- ----------------------------------------------------------------------------

create policy "content_items: public read published"
  on public.content_items for select
  using (status = 'published' or public.is_admin());

create policy "content_items: admin write"
  on public.content_items for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "authors: public read"
  on public.authors for select using (true);

create policy "authors: admin write"
  on public.authors for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "course_modules: public read if course published"
  on public.course_modules for select
  using (
    exists (
      select 1 from public.content_items ci
      where ci.id = course_id and (ci.status = 'published' or public.is_admin())
    )
  );

create policy "course_modules: admin write"
  on public.course_modules for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "course_lessons: public read if module's course published"
  on public.course_lessons for select
  using (
    exists (
      select 1
      from public.course_modules m
      join public.content_items ci on ci.id = m.course_id
      where m.id = module_id and (ci.status = 'published' or public.is_admin())
    )
  );

create policy "course_lessons: admin write"
  on public.course_lessons for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- plans / coupons: public read active plan, admin writes
-- ----------------------------------------------------------------------------

create policy "plans: public read active"
  on public.plans for select
  using (is_active = true or public.is_admin());

create policy "plans: admin write"
  on public.plans for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "coupons: admin only"
  on public.coupons for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- stripe_events: service role only (policy denies all; service role bypasses RLS)
-- ----------------------------------------------------------------------------

create policy "stripe_events: admin read"
  on public.stripe_events for select
  using (public.is_admin());

-- ==== 3. STORAGE BUCKETS ====

-- ============================================================================
-- Ulilearn — Storage buckets + RLS
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('covers', 'covers', true),
  ('avatars', 'avatars', true),
  ('authors', 'authors', true)
on conflict (id) do nothing;

-- Public read for all three buckets
create policy "public read covers"  on storage.objects for select using (bucket_id = 'covers');
create policy "public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "public read authors" on storage.objects for select using (bucket_id = 'authors');

-- User can upload own avatar (folder prefix = their uid)
create policy "user upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "user update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins upload to covers/authors
create policy "admin upload covers"
  on storage.objects for insert
  with check (bucket_id = 'covers' and public.is_admin());

create policy "admin update covers"
  on storage.objects for update
  using (bucket_id = 'covers' and public.is_admin());

create policy "admin upload authors"
  on storage.objects for insert
  with check (bucket_id = 'authors' and public.is_admin());

create policy "admin update authors"
  on storage.objects for update
  using (bucket_id = 'authors' and public.is_admin());

-- ==== 4. LEADS RLS + CONVERSION TRIGGER ====

-- ============================================================================
-- Ulilearn — Leads table RLS + conversion linking trigger
-- Run after `prisma migrate` has created public.leads.
-- ============================================================================

alter table public.leads enable row level security;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------
-- anon and authenticated users cannot read/write leads directly.
-- Inserts and updates happen server-side via service_role (webhook, tRPC).
-- Admins can read all leads via the is_admin() claim.

create policy "leads: admin full access"
  on public.leads for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Extend handle_new_auth_user: when a new Supabase auth.users is created,
-- link any pending lead rows with matching email to the new user.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_lead_id uuid;
begin
  -- 1) Mirror auth.users → public.users (original behavior)
  insert into public.users (id, email, full_name, auth_provider, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    case when new.raw_app_meta_data->>'provider' = 'google' then 'google'::auth_provider else 'email'::auth_provider end,
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- 2) Attribute any pending lead (earliest unconverted one for this email)
  select id into matched_lead_id
  from public.leads
  where email = new.email
    and converted_user_id is null
  order by created_at asc
  limit 1;

  if matched_lead_id is not null then
    update public.leads
      set converted_user_id = new.id,
          converted_at      = now(),
          status            = 'converted',
          updated_at        = now()
      where id = matched_lead_id;

    update public.users
      set origin_lead_id = matched_lead_id,
          updated_at     = now()
      where id = new.id;
  end if;

  return new;
end;
$$;

-- Trigger already exists from 0001; recreate to pick up the new function body
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
