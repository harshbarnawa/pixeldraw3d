-- ============================================================
-- PixelDraw3D · Phase 1 — public.profiles (the user record)
--
-- One row per authenticated user, keyed by auth.users(id).
-- Created automatically on signup by handle_new_user().
--
-- Apply in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run more than once.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  full_name             text not null default '',
  display_name          text not null default '',
  username              text unique not null,
  email                 text,
  profile_photo         text,
  provider              text not null default 'google',
  current_plan          text not null default 'FREE',
  cloud_designs_used    int  not null default 0,
  cloud_designs_limit   int  not null default 5,
  image_imports_used    int  not null default 0,
  image_imports_limit   int  not null default 2,
  image_imports_day     date,
  subscription_status   text not null default 'NONE',
  billing_cycle         text not null default 'MONTHLY',
  created_at            timestamptz not null default now(),
  last_login            timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Auto-create a profile row on signup, with a guaranteed-unique
-- auto-generated username (e.g. harsh_4821).
-- ------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
begin
  -- strip the google name down to url-safe characters, lowercased
  base := lower(
    regexp_replace(
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), new.email),
      '[^a-z0-9]+', '_', 'g'
    )
  );
  base := substr(base, 1, 24);
  if base in ('', '_', 'user', 'null') then
    base := 'user';
  end if;

  -- retry with a random numeric suffix until it is unique
  loop
    candidate := base || '_' || (floor(random() * 9000) + 1000)::int;
    exit when not exists (select 1 from public.profiles where username = candidate);
  end loop;

  insert into public.profiles (
    id, full_name, display_name, username, email, profile_photo, provider
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    candidate,
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.app_metadata ->> 'provider', 'google')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- Keep last_login fresh on each sign-in.
-- ------------------------------------------------------------------
create or replace function public.touch_last_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set last_login = now() where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute function public.touch_last_login();

-- ------------------------------------------------------------------
-- Row Level Security.
-- Anyone may read profiles (public community); only the owner may edit.
-- ------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);
