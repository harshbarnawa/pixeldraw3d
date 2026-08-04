-- ============================================================
-- PixelDraw3D · Phase 9 — security: protect privileged columns
--
-- The profiles update policy lets the owner edit their own row, which is right
-- for display_name / username / avatar. But it would ALSO let a caller hit the
-- API directly and flip current_plan to 'PRO' to unlock paid features client-
-- side. This trigger blocks changes to the billing/plan columns unless the
-- writer is the service role (or a dashboard session) — exactly the contexts
-- where auth.uid() is null. The payment edge functions (service role) and the
-- Supabase table editor still work unchanged.
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

create or replace function public.protect_plan_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.current_plan is distinct from old.current_plan
       or new.subscription_status is distinct from old.subscription_status
       or new.billing_cycle is distinct from old.billing_cycle
       or new.subscription_expires_at is distinct from old.subscription_expires_at
       or new.next_billing_date is distinct from old.next_billing_date
    then
      raise exception 'billing fields can only be changed by the service role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_plan_columns on public.profiles;
create trigger protect_plan_columns
  before update on public.profiles
  for each row execute function public.protect_plan_columns();
