-- ============================================================================
-- Ulilearn — Promote leads.source to enum and add project_brief column.
--
-- Motivation: we're introducing a second lead magnet ("analyze your photo
-- project idea") that writes to the same `leads` table. Distinguish the
-- lead magnets via a typed enum and add a nullable text field for the
-- project brief. Also relax instagram_url to NULL since it doesn't apply
-- to project-brief leads.
--
-- Idempotent: this whole file is safe to run any number of times.
-- ============================================================================

-- 1. Enum type.
do $$ begin
  create type "lead_source" as enum ('lead_magnet_ig', 'lead_magnet_project');
exception
  when duplicate_object then null;
end $$;

-- 2. Promote leads.source from text → lead_source (only if not already).
do $$
declare
  current_type text;
begin
  select data_type into current_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'leads'
    and column_name = 'source';

  if current_type is distinct from 'USER-DEFINED' then
    alter table "public"."leads" alter column "source" drop default;
    alter table "public"."leads"
      alter column "source" type "lead_source"
      using "source"::"lead_source";
    alter table "public"."leads"
      alter column "source" set default 'lead_magnet_ig'::"lead_source";
  end if;
end $$;

-- 3. Relax instagram_url to nullable (no-op if already nullable).
do $$
declare
  is_nullable text;
begin
  select c.is_nullable into is_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'leads'
    and c.column_name = 'instagram_url';

  if is_nullable = 'NO' then
    alter table "public"."leads" alter column "instagram_url" drop not null;
  end if;
end $$;

-- 4. New column for project briefs (nullable).
alter table "public"."leads"
  add column if not exists "project_brief" text;
