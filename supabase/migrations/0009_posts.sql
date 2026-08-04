-- ============================================================
-- PixelDraw3D · text posts (community)
--
-- A lightweight social post (just text for now) with likes. Posts appear in
-- the community feed alongside shared designs. RLS: everyone reads, the author
-- writes and deletes their own. The profiles FK lets PostgREST join the author
-- in feed queries.
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  body        text not null check (length(btrim(body)) > 0),
  like_count  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- joinable author for PostgREST feed queries
alter table public.posts
  drop constraint if exists posts_user_id_profiles_fk;
alter table public.posts
  add constraint posts_user_id_profiles_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- post likes (separate from design post_likes — this one is keyed by post_id)
create table if not exists public.post_like (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
alter table public.posts enable row level security;
alter table public.post_like enable row level security;

drop policy if exists "posts readable by everyone" on public.posts;
create policy "posts readable by everyone" on public.posts for select using (true);

drop policy if exists "users can post" on public.posts;
create policy "users can post" on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "users can delete own post" on public.posts;
create policy "users can delete own post" on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "post likes readable by everyone" on public.post_like;
create policy "post likes readable by everyone" on public.post_like for select using (true);

drop policy if exists "users can like post" on public.post_like;
create policy "users can like post" on public.post_like for insert with check (auth.uid() = user_id);

drop policy if exists "users can unlike post" on public.post_like;
create policy "users can unlike post" on public.post_like for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- like counter trigger
-- ------------------------------------------------------------------
create or replace function public.bump_post_like_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
drop trigger if exists bump_post_like_counts on public.post_like;
create trigger bump_post_like_counts
  after insert or delete on public.post_like
  for each row execute function public.bump_post_like_counts();

-- ------------------------------------------------------------------
-- Realtime: new posts stream into the feed
-- ------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;
