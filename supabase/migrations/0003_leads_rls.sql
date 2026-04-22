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
