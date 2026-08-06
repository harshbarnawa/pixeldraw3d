-- ============================================================
-- PixelDraw3D · migration 0012 — add missing updated_at to profiles
--
-- The profiles table was created in 0001 without updated_at, but
-- every payment edge function writes it (create-subscription,
-- verify-payment, verify-subscription, cancel-subscription,
-- razorpay-webhook). PostgREST rejects the write → HTTP 500.
--
-- Safe to re-run (IF NOT EXISTS).
-- ============================================================

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Backfill existing rows so the column isn't null for anyone.
update public.profiles set updated_at = created_at where updated_at is null;
