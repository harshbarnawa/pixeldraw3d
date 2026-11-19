create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_design_id text;
begin
  changed_design_id := case when tg_op = 'DELETE' then old.design_id else new.design_id end;

  update public.posts p
  set comment_count = (
    select count(*)::int
    from public.post_comments c
    where c.design_id = changed_design_id
  )
  where p.design_id = changed_design_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_post_comment_count on public.post_comments;
create trigger sync_post_comment_count
after insert or delete on public.post_comments
for each row execute function public.sync_post_comment_count();

alter function public.bump_follow_counts() security definer;
alter function public.bump_follow_counts() set search_path = public;
alter function public.bump_like_counts() security definer;
alter function public.bump_like_counts() set search_path = public;
alter function public.bump_comment_counts() security definer;
alter function public.bump_comment_counts() set search_path = public;
alter function public.bump_share_counts() security definer;
alter function public.bump_share_counts() set search_path = public;
alter function public.bump_design_counts() security definer;
alter function public.bump_design_counts() set search_path = public;
alter function public.bump_post_like_counts() security definer;
alter function public.bump_post_like_counts() set search_path = public;

update public.posts p
set comment_count = (
  select count(*)::int
  from public.post_comments c
  where c.design_id = p.design_id
)
where p.design_id is not null;
