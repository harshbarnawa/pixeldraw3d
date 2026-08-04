-- ============================================================
-- PixelDraw3D · Phase 8 — performance indexes
--
-- verify-payment and razorpay-webhook both look up a payment row by
-- razorpay_order_id (the webhook path has no user_id to filter on first), so a
-- dedicated index keeps those lookups a fast index scan instead of a table
-- scan. The other hot paths already have covering indexes:
--   designs(user_id, updated_at desc) · design_versions(design_id, saved_at desc)
--   payments(user_id, created_at desc) · invoices(user_id, issued_at desc)
--
-- Apply in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================

create index if not exists payments_razorpay_order_idx
  on public.payments (razorpay_order_id);
