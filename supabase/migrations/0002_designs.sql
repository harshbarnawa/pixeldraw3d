-- ============================================================
-- PixelDraw3D · Phase 2 — cloud designs + version history
--
-- One row per design, owned by an authenticated user. Private in this
-- phase (RLS allows the owner only); `is_public` is reserved for the
-- community phase. Versions are snapshots of a design taken on save so
-- the user can roll back.
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

create table if not exists public.designs (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null default 'Untitled design',
  grid         jsonb not null default '[]',
  size         int  not null default 10,
  extrude      int  not null default 2,
  random_lift  int  not null default 0,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists designs_user_updated_idx
  on public.designs (user_id, updated_at desc);

create table if not exists public.design_versions (
  id          uuid primary key default gen_random_uuid(),
  design_id   text not null references public.designs (id) on delete cascade,
  name        text not null,
  grid        jsonb not null,
  size        int  not null,
  extrude     int  not null,
  random_lift int  not null,
  saved_at    timestamptz not null default now()
);

create index if not exists design_versions_design_idx
  on public.design_versions (design_id, saved_at desc);

-- ------------------------------------------------------------------
-- Row Level Security — owners only (community phase relaxes this).
-- ------------------------------------------------------------------
alter table public.designs enable row level security;
alter table public.design_versions enable row level security;

drop policy if exists "users can manage own designs" on public.designs;
create policy "users can manage own designs"
  on public.designs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can manage own design versions" on public.design_versions;
create policy "users can manage own design versions"
  on public.design_versions
  for all
  using (
    exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid())
  );
