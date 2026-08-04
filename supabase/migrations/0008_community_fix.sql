-- ============================================================
-- PixelDraw3D · fix(community): backfill profiles + PostgREST joins
--
-- Two bugs blocked the feed:
--   1. Existing auth.users (created before the handle_new_user trigger existed)
--      had NO profile rows, so search / creator joins returned nothing.
--   2. The community tables FK'd user_id to auth.users(id) only. PostgREST
--      exposes the public schema, so it could not infer a designs→profiles
--      relationship — every `profiles!inner(...)` join failed with PGRST200.
--
-- This migration backfills missing profiles and adds public-schema FKs to
-- public.profiles so PostgREST can resolve the joins. ON DELETE CASCADE keeps
-- account deletion working (both FK paths fire cleanly).
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

-- ---------- 1. backfill missing profiles from auth.users ----------
insert into public.profiles (
  id, full_name, display_name, username, email, profile_photo, provider
)
select
  au.id,
  coalesce(nullif(btrim(au.raw_user_meta_data ->> 'name'), ''), au.email, ''),
  coalesce(nullif(btrim(au.raw_user_meta_data ->> 'name'), ''), au.email, ''),
  substr(
    coalesce(
      nullif(regexp_replace(lower(coalesce(au.raw_user_meta_data ->> 'name', 'user')), '[^a-z0-9]+', '_', 'g'), ''),
      'user'
    ),
    1, 20
  ) || '_' || substr(replace(au.id::text, '-', ''), 1, 6),
  au.email,
  coalesce(au.raw_user_meta_data ->> 'avatar_url', au.raw_user_meta_data ->> 'picture', ''),
  coalesce(au.app_metadata ->> 'provider', 'google')
from auth.users au
on conflict (id) do nothing;

-- ---------- 2. public-schema FKs so PostgREST can join to profiles ----------
alter table public.designs
  drop constraint if exists designs_user_id_profiles_fk;
alter table public.designs
  add constraint designs_user_id_profiles_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.post_comments
  drop constraint if exists post_comments_user_id_profiles_fk;
alter table public.post_comments
  add constraint post_comments_user_id_profiles_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.post_likes
  drop constraint if exists post_likes_user_id_profiles_fk;
alter table public.post_likes
  add constraint post_likes_user_id_profiles_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.shares
  drop constraint if exists shares_user_id_profiles_fk;
alter table public.shares
  add constraint shares_user_id_profiles_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.follows
  drop constraint if exists follows_follower_profiles_fk;
alter table public.follows
  add constraint follows_follower_profiles_fk
  foreign key (follower_id) references public.profiles (id) on delete cascade;

alter table public.follows
  drop constraint if exists follows_following_profiles_fk;
alter table public.follows
  add constraint follows_following_profiles_fk
  foreign key (following_id) references public.profiles (id) on delete cascade;
