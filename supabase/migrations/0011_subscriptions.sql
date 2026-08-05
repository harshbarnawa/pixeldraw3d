-- ============================================================
-- PixelDraw3D · Phase 6.5 — Razorpay recurring subscriptions
--
-- Turns the one-time Orders flow into a professional recurring-billing
-- product (Razorpay Subscriptions):
--
--   * profiles   → razorpay_customer_id / razorpay_subscription_id /
--                  razorpay_plan_id   (link the user to Razorpay entities)
--   * payments   → razorpay_subscription_id / razorpay_plan_id /
--                  razorpay_invoice_id / invoice_url   (per-charge records)
--   * invoices   → razorpay_invoice_id / invoice_url   (renewal invoices)
--   * razorpay_plans   → cache of created Razorpay plans (rebuildable)
--   * webhook_events   → idempotency ledger for webhook delivery
--   * expire_subscriptions() + pg_cron → automatic downgrade backstop
--
-- Apply in the Supabase SQL Editor (or supabase db push). Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. New columns
-- ------------------------------------------------------------------
alter table public.profiles
  add column if not exists razorpay_customer_id text;
alter table public.profiles
  add column if not exists razorpay_subscription_id text;
alter table public.profiles
  add column if not exists razorpay_plan_id text;

alter table public.payments
  add column if not exists razorpay_subscription_id text;
alter table public.payments
  add column if not exists razorpay_plan_id text;
alter table public.payments
  add column if not exists razorpay_invoice_id text;
alter table public.payments
  add column if not exists invoice_url text;

alter table public.invoices
  add column if not exists razorpay_invoice_id text;
alter table public.invoices
  add column if not exists invoice_url text;

-- Webhook lookups go by subscription id — index it.
create index if not exists payments_subscription_idx
  on public.payments (razorpay_subscription_id)
  where razorpay_subscription_id is not null;

-- Partial index so the hourly expiry sweep stays cheap as profiles grow.
create index if not exists profiles_expiry_idx
  on public.profiles (subscription_expires_at)
  where subscription_expires_at is not null;

-- ------------------------------------------------------------------
-- 2. razorpay_plans — created plan ids, keyed by plan_key ("plus_monthly")
-- ------------------------------------------------------------------
create table if not exists public.razorpay_plans (
  plan_key          text primary key,
  plan              text not null,          -- plus | pro
  cycle             text not null,          -- monthly | yearly
  razorpay_plan_id  text not null,
  amount            int  not null,          -- paise
  currency          text not null default 'INR',
  created_at        timestamptz not null default now()
);

-- Only the edge functions (service role) touch this.
alter table public.razorpay_plans enable row level security;

-- ------------------------------------------------------------------
-- 3. webhook_events — idempotency ledger (one row per Razorpay event.id)
-- ------------------------------------------------------------------
create table if not exists public.webhook_events (
  id            text primary key,           -- Razorpay event id
  event_type    text not null,
  payload       jsonb,
  processed_at  timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

-- ------------------------------------------------------------------
-- 4. Expiry backstop — downgrade non-renewing profiles past their date
--
-- Never touches ACTIVE rows: renewals are the webhook's job (it extends
-- subscription_expires_at before the old period lapses), so downgrading on
-- date alone would race a delayed renewal event. Only statuses that mean
-- "no more charges coming" are eligible.
-- ------------------------------------------------------------------
create or replace function public.expire_subscriptions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.profiles
     set current_plan = 'FREE',
         subscription_status = 'EXPIRED',
         updated_at = now()
   where razorpay_subscription_id is not null
     and subscription_expires_at is not null
     and subscription_expires_at < now()
     and upper(subscription_status) in
         ('CANCELLED', 'COMPLETED', 'EXPIRED', 'HALTED', 'PAST_DUE', 'NONE');

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ------------------------------------------------------------------
-- 5. pg_cron schedule (backstop, every minute — cheap on a small table)
-- ------------------------------------------------------------------
create extension if not exists pg_cron;

-- Replace any prior run of this job (safe to re-apply the migration).
do $$
declare
  jobid int;
begin
  select j.jobid into jobid from cron.job j where j.jobname = 'pd3d-expire-subs';
  if jobid is not null then
    perform cron.unschedule(jobid);
  end if;
end $$;

select cron.schedule('pd3d-expire-subs', '* * * * *', 'select public.expire_subscriptions()');

-- ------------------------------------------------------------------
-- 6. Security: extend protect_plan_columns so owners can't forge the
-- Razorpay linkage (customer / subscription / plan ids) either.
-- Replaces the Phase 9 version — same trigger, wider column set.
-- ------------------------------------------------------------------
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
       or new.razorpay_customer_id is distinct from old.razorpay_customer_id
       or new.razorpay_subscription_id is distinct from old.razorpay_subscription_id
       or new.razorpay_plan_id is distinct from old.razorpay_plan_id
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
