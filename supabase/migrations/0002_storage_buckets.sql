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
