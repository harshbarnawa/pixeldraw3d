-- ============================================================
-- PixelDraw3D · Phase 6 — Razorpay payments + invoices
--
-- One row per payment attempt (order created), plus one invoice row per
-- successful payment. The Edge Functions write to these with the service-role
-- key; RLS lets each user read only their own history.
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  plan                  text not null,
  cycle                 text not null default 'monthly',
  amount                int  not null,               -- paise
  currency              text not null default 'INR',
  razorpay_order_id     text,
  razorpay_payment_id   text,
  razorpay_signature    text,
  status                text not null default 'pending', -- pending | paid | failed | refunded
  signature_verified    boolean not null default false,
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);

create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  payment_id      uuid not null references public.payments (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  invoice_number  text,
  plan            text not null,
  cycle           text not null,
  amount          int  not null,
  currency        text not null default 'INR',
  status          text not null,
  issued_at       timestamptz not null default now()
);

create index if not exists invoices_user_issued_idx
  on public.invoices (user_id, issued_at desc);

-- Subscription lifecycle fields on the profile (drives the billing summary UI).
alter table public.profiles
  add column if not exists subscription_expires_at timestamptz;
alter table public.profiles
  add column if not exists next_billing_date timestamptz;

-- ------------------------------------------------------------------
-- Row Level Security — owners read their own history only.
-- ------------------------------------------------------------------
alter table public.payments enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "users can read own payments" on public.payments;
create policy "users can read own payments"
  on public.payments
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can read own invoices" on public.invoices;
create policy "users can read own invoices"
  on public.invoices
  for select
  using (auth.uid() = user_id);
