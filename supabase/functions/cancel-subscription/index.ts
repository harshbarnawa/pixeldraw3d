// POST /cancel-subscription
//
// Cancels the caller's recurring Razorpay subscription — this tells Razorpay
// to stop ALL future auto-charges (cancel_at_cycle_end), so the user is never
// billed again. Premium access continues until subscription_expires_at, then
// the expiry sweep (pg_cron expire_subscriptions) downgrades the plan.
//
// Lifetime purchases have no recurring charge and are left untouched. The
// endpoint is idempotent: cancelling an already-cancelled sub is a no-op.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  authUser,
  cancelRazorpaySubscription,
  createSupabase,
  json,
  rateLimit,
} from "../_shared/razorpay.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)
    if (!rateLimit(`cancel:${user.id}`, 5, 60_000)) return json({ error: "too many requests" }, 429)

    const supabase = createSupabase()
    const { data: profile } = await supabase
      .from("profiles")
      .select("razorpay_subscription_id, subscription_status, billing_cycle")
      .eq("id", user.id)
      .maybeSingle()

    const status = String(profile?.subscription_status ?? "NONE").toUpperCase()

    // Nothing recurring to stop.
    if (!profile?.razorpay_subscription_id) {
      if (String(profile?.billing_cycle ?? "").toUpperCase() === "LIFETIME") {
        return json({ ok: true, note: "lifetime" }) // permanent access, nothing to cancel
      }
      return json({ error: "no active subscription" }, 400)
    }

    // Idempotent: already cancelled/completed/expired → nothing to do.
    if (["CANCELLED", "COMPLETED", "EXPIRED"].includes(status)) {
      return json({ ok: true })
    }

    // Stop future charges at Razorpay (access stays until the period end).
    try {
      await cancelRazorpaySubscription(profile.razorpay_subscription_id)
    } catch (e) {
      // If Razorpay says it's already cancelled/completed, that's fine — only
      // rethrow genuinely unexpected failures.
      const msg = e.message ?? ""
      if (!/already (cancelled|completed)|subscription.*(cancelled|completed)/i.test(msg)) throw e
    }

    const { error } = await supabase
      .from("profiles")
      .update({ subscription_status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", user.id)
    if (error) throw error

    return json({ ok: true })
  } catch (e) {
    console.error("cancel-subscription:", e.message)
    return json({ error: e.message }, 500)
  }
})
