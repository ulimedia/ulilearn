-- ============================================================================
-- Ulilearn — Promote leads.source to enum and add project_brief column.
--
-- Motivation: we're introducing a second lead magnet ("analyze your photo
-- project idea") that writes to the same `leads` table. Distinguish the
-- lead magnets via a typed enum and add a nullable text field for the
-- project brief. Also relax instagram_url to NULL since it doesn't apply
-- to project-brief leads.
-- ============================================================================

-- 1. Enum type (idempotent)
do $$ begin
  create type "lead_source" as enum ('lead_magnet_ig', 'lead_magnet_project');
exception
  when duplicate_object then null;
end $$;

-- 2. Promote leads.source from text → lead_source.
--    Existing rows already contain 'lead_magnet_ig' (via the column default),
--    so the cast is safe. We drop the old default, change the type, then
--    re-establish the default as the enum literal.
alter table "public"."leads"
  alter column "source" drop default;

alter table "public"."leads"
  alter column "source" type "lead_source"
  using "source"::"lead_source";

alter table "public"."leads"
  alter column "source" set default 'lead_magnet_ig'::"lead_source";

-- 3. Relax instagram_url: project-brief leads don't have one.
alter table "public"."leads"
  alter column "instagram_url" drop not null;

-- 4. New column for project briefs (nullable).
alter table "public"."leads"
  add column if not exists "project_brief" text;
