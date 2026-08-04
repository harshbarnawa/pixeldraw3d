-- ============================================================
-- PixelDraw3D · redesign posts as design posts (Reddit/Twitter-style)
--
-- A post can now attach a design (design_id nullable). Publishing a design
-- creates a post with the design + an optional quote; the design's own
-- is_public flag stays true so the design page / profile grid still work.
-- Body is only required when there is no attached design.
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

alter table public.posts
  add column if not exists design_id text references public.designs (id) on delete cascade;

alter table public.posts
  add column if not exists comment_count int not null default 0;

-- a post needs text, or a design, or both
alter table public.posts
  drop constraint if exists posts_body_check;
alter table public.posts
  alter column body drop not null;
alter table public.posts
  add constraint posts_body_check
  check (coalesce(btrim(body), '') <> '' or design_id is not null);

create index if not exists posts_design_idx on public.posts (design_id);
create index if not exists posts_like_idx on public.posts (like_count desc);

-- keep a design post's comment_count in sync with the design's comments
create or replace function public.sync_post_comment_count()
returns trigger language plpgsql as $$
begin
  update public.posts p
  set comment_count = (
    select count(*) from public.post_comments c where c.design_id = p.design_id
  )
  where p.design_id = new.design_id;
  return new;
end $$;
drop trigger if exists sync_post_comment_count on public.post_comments;
create trigger sync_post_comment_count
  after insert or delete on public.post_comments
  for each row execute function public.sync_post_comment_count();
