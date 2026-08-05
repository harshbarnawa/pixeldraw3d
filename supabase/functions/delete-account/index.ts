// POST /delete-account
//
// Permanently deletes the caller's auth user via the admin API. Before that it
// cancels any live Razorpay subscription (best-effort) so no future auto-charge
// fires against a deleted account. The user's profile, designs, payments and
// invoices all cascade (every table FKs auth.users with ON DELETE CASCADE).
// Uses the service-role key — the anon key can't call admin.deleteUser, so a
// client can only ever delete its own account.

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
    if (!rateLimit(`delete:${user.id}`, 3, 60_000)) return json({ error: "too many requests" }, 429)

    const supabase = createSupabase()

    // Stop future charges before the account row (and its cascade) disappears.
    const { data: profile } = await supabase
      .from("profiles")
      .select("razorpay_subscription_id, subscription_status")
      .eq("id", user.id)
      .maybeSingle()
    const subId = profile?.razorpay_subscription_id
    const status = String(profile?.subscription_status ?? "NONE").toUpperCase()
    if (subId && !["CANCELLED", "COMPLETED", "EXPIRED"].includes(status)) {
      try {
        await cancelRazorpaySubscription(subId)
      } catch (e) {
        // A failed cancel must not block account deletion; the customer can
        // still dispute/stop via the Razorpay dashboard.
        console.error("delete-account: cancel subscription failed:", e.message)
      }
    }

    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw error

    return json({ ok: true })
  } catch (e) {
    console.error("delete-account:", e.message)
    return json({ error: e.message }, 500)
  }
})
