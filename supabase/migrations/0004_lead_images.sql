-- ============================================================================
-- Ulilearn — Lead magnet images: Storage bucket + scraped_images column
-- Run on an existing Supabase project where 0003_apply_lead_magnet has run.
-- ============================================================================

-- 1. Add scraped_images column to leads
alter table "public"."leads"
  add column if not exists "scraped_images" text[] not null default '{}';

-- 2. Create the public bucket for uploaded Instagram images
insert into storage.buckets (id, name, public) values
  ('lead-images', 'lead-images', true)
on conflict (id) do nothing;

-- 3. Public read (images shown inside /io/analisi/[id] — private context but
--    the URLs themselves are unguessable because they include the lead UUID).
drop policy if exists "public read lead-images" on storage.objects;
create policy "public read lead-images"
  on storage.objects for select
  using (bucket_id = 'lead-images');

-- Uploads are performed via the service_role (server-side only) which
-- bypasses RLS, so no INSERT policy is needed.
