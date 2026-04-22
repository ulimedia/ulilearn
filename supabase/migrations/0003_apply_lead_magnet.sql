-- ============================================================================
-- Ulilearn — Lead magnet feature: incremental migration
-- Use this file on an EXISTING Supabase project (where 0000+0001+0002 already ran).
-- For a fresh project, use supabase/setup.sql instead.
--
-- What this adds:
--   1. lead_status enum
--   2. leads table + indexes
--   3. users.origin_lead_id column
--   4. RLS policies for leads
--   5. Trigger cascading auth.users → public.leads.converted_user_id
-- ============================================================================

-- 1. Enum
do $$ begin
  create type "lead_status" as enum ('new', 'analyzed', 'emailed', 'converted', 'bounced');
exception
  when duplicate_object then null;
end $$;

-- 2. users.origin_lead_id
alter table "public"."users"
  add column if not exists "origin_lead_id" uuid;

-- 3. leads table
create table if not exists "public"."leads" (
  "id" uuid primary key default gen_random_uuid(),
  "email" text not null,
  "instagram_url" text not null,
  "instagram_handle" text,
  "source" text not null default 'lead_magnet_ig',
  "status" "lead_status" not null default 'new',
  "marketing_consent" boolean not null default true,
  "analysis_json" jsonb,
  "analysis_model" text,
  "analysis_tokens_in" integer,
  "analysis_tokens_out" integer,
  "analysis_cost_cents" integer,
  "analysis_error" text,
  "utm_source" text,
  "utm_medium" text,
  "utm_campaign" text,
  "referrer_url" text,
  "ip_hash" text,
  "user_agent" text,
  "turnstile_verified" boolean not null default false,
  "converted_user_id" uuid,
  "converted_at" timestamptz,
  "email_sent_at" timestamptz,
  "email_message_id" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index if not exists "leads_email_idx"            on "public"."leads" ("email");
create index if not exists "leads_status_created_idx"   on "public"."leads" ("status", "created_at");
create index if not exists "leads_created_at_idx"       on "public"."leads" ("created_at");

-- FK leads.converted_user_id → users.id (soft link, set null on delete)
do $$ begin
  alter table "public"."leads"
    add constraint "leads_converted_user_id_fkey"
    foreign key ("converted_user_id") references "public"."users"("id")
    on delete set null;
exception
  when duplicate_object then null;
end $$;

-- 4. RLS
alter table "public"."leads" enable row level security;

drop policy if exists "leads: admin full access" on "public"."leads";
create policy "leads: admin full access"
  on "public"."leads" for all
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Extend handle_new_auth_user to link existing lead rows on signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_lead_id uuid;
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

-- Trigger refresh (already exists from 0001; re-create to pick up new body)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
