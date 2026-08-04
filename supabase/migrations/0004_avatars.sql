-- ============================================================
-- PixelDraw3D · Phase 7 — avatars storage bucket
--
-- Public bucket so avatar URLs load without auth. Uploads/updates are limited
-- to the object owner by name prefix (avatars are stored as `<uid>.<ext>`).
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152)
on conflict (id) do nothing;

drop policy if exists "users can upload own avatar" on storage.objects;
create policy "users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name like (auth.uid()::text || '%'));

drop policy if exists "users can update own avatar" on storage.objects;
create policy "users can update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name like (auth.uid()::text || '%'));
