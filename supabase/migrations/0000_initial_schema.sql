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

