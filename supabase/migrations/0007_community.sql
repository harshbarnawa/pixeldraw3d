-- ============================================================
-- PixelDraw3D · Phase 11 — community (follows, likes, comments, shares)
--
-- Pinterest-style social layer. Public designs get a counter set; follows,
-- likes, comments and shares are separate tables with RLS. Counter triggers
-- keep denormalized counts (profiles.follower_count, designs.like_count, …) in
-- sync so feed queries never count rows on the fly.
--
-- Privacy: the existing designs policy is owner-only. A SECOND select policy
-- below lets everyone read designs where is_public = true — private designs
-- stay visible only to their owner. Realtime reads respect the same RLS.
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

-- ---------- profiles: community fields ----------
alter table public.profiles
  add column if not exists bio text not null default '';
alter table public.profiles
  add column if not exists follower_count int not null default 0;
alter table public.profiles
  add column if not exists following_count int not null default 0;
alter table public.profiles
  add column if not exists design_count int not null default 0;

-- ---------- designs: counters ----------
alter table public.designs
  add column if not exists like_count int not null default 0;
alter table public.designs
  add column if not exists comment_count int not null default 0;
alter table public.designs
  add column if not exists share_count int not null default 0;

-- ---------- follows ----------
create table if not exists public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

-- ---------- post likes ----------
create table if not exists public.post_likes (
  design_id  text not null references public.designs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (design_id, user_id)
);

-- ---------- post comments ----------
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  design_id  text not null references public.designs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_design_idx
  on public.post_comments (design_id, created_at);

-- ---------- shares (row kept so we could show "X people shared" later) ----------
create table if not exists public.shares (
  design_id  text not null references public.designs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (design_id, user_id)
);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.shares enable row level security;

-- follows: everyone reads, you write your own edges
drop policy if exists "follows readable by everyone" on public.follows;
create policy "follows readable by everyone" on public.follows for select using (true);

drop policy if exists "users can follow" on public.follows;
create policy "users can follow" on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "users can unfollow" on public.follows;
create policy "users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- likes: everyone reads, you like/unlike your own
drop policy if exists "likes readable by everyone" on public.post_likes;
create policy "likes readable by everyone" on public.post_likes for select using (true);

drop policy if exists "users can like" on public.post_likes;
create policy "users can like" on public.post_likes for insert with check (auth.uid() = user_id);

drop policy if exists "users can unlike" on public.post_likes;
create policy "users can unlike" on public.post_likes for delete using (auth.uid() = user_id);

-- comments: everyone reads, you comment / delete your own
drop policy if exists "comments readable by everyone" on public.post_comments;
create policy "comments readable by everyone" on public.post_comments for select using (true);

drop policy if exists "users can comment" on public.post_comments;
create policy "users can comment" on public.post_comments for insert with check (auth.uid() = user_id);

drop policy if exists "users can delete own comment" on public.post_comments;
create policy "users can delete own comment" on public.post_comments for delete using (auth.uid() = user_id);

-- shares: everyone reads, you record your own
drop policy if exists "shares readable by everyone" on public.shares;
create policy "shares readable by everyone" on public.shares for select using (true);

drop policy if exists "users can share" on public.shares;
create policy "users can share" on public.shares for insert with check (auth.uid() = user_id);

-- Public designs become readable by everyone (complements the owner-only policy).
-- Private designs are still owner-only — this is the privacy guarantee.
drop policy if exists "public designs readable by everyone" on public.designs;
create policy "public designs readable by everyone"
  on public.designs for select using (is_public = true);

-- ------------------------------------------------------------------
-- Counter triggers (denormalized counts)
-- ------------------------------------------------------------------
create or replace function public.bump_follow_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.following_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end $$;
drop trigger if exists bump_follow_counts on public.follows;
create trigger bump_follow_counts
  after insert or delete on public.follows
  for each row execute function public.bump_follow_counts();

create or replace function public.bump_like_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.designs set like_count = like_count + 1 where id = new.design_id;
  elsif tg_op = 'DELETE' then
    update public.designs set like_count = greatest(like_count - 1, 0) where id = old.design_id;
  end if;
  return null;
end $$;
drop trigger if exists bump_like_counts on public.post_likes;
create trigger bump_like_counts
  after insert or delete on public.post_likes
  for each row execute function public.bump_like_counts();

create or replace function public.bump_comment_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.designs set comment_count = comment_count + 1 where id = new.design_id;
  elsif tg_op = 'DELETE' then
    update public.designs set comment_count = greatest(comment_count - 1, 0) where id = old.design_id;
  end if;
  return null;
end $$;
drop trigger if exists bump_comment_counts on public.post_comments;
create trigger bump_comment_counts
  after insert or delete on public.post_comments
  for each row execute function public.bump_comment_counts();

create or replace function public.bump_share_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.designs set share_count = share_count + 1 where id = new.design_id;
  end if;
  return null;
end $$;
drop trigger if exists bump_share_counts on public.shares;
create trigger bump_share_counts
  after insert on public.shares
  for each row execute function public.bump_share_counts();

create or replace function public.bump_design_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set design_count = design_count + 1 where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set design_count = greatest(design_count - 1, 0) where id = old.user_id;
  end if;
  return null;
end $$;
drop trigger if exists bump_design_counts on public.designs;
create trigger bump_design_counts
  after insert or delete on public.designs
  for each row execute function public.bump_design_counts();

-- ------------------------------------------------------------------
-- Realtime: follow/like/comment events flow to subscribed clients.
-- ------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.follows;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.post_likes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.post_comments;
exception when duplicate_object then null; end $$;
