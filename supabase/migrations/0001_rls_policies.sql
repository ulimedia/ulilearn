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
