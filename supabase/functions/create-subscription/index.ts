// POST /create-subscription  { plan, cycle }   (cycle: monthly | yearly)
//
// Creates a recurring Razorpay subscription for the caller: looks up (or
// creates + caches) the plan, creates the subscription with a "until cancelled"
// total_count, records a pending payment row and returns the checkout payload.
// The client then opens Razorpay Checkout with the subscription_id, which saves
// the card token and collects the first payment. Everything billing-relevant is
// decided server-side; the client can't tamper with amount or period.
//
// Upgrades (existing ACTIVE subscription, higher tier) cancel the old
// subscription at its cycle end first, so premium access never lapses and no
// future charge is left running against the old plan.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  PLANS,
  authUser,
  cancelRazorpaySubscription,
  createSupabase,
  fetchSubscription,
  getOrCreatePlan,
  getRazorpaySecrets,
  json,
  planAmount,
  rateLimit,
  rzpRequest,
  safeJson,
} from "../_shared/razorpay.ts"

// Razorpay caps end_time at ~4 765 046 400 (≈ year 2211).  With the current
// time ~1.786 × 10⁹ the max total_count is ≈1 149 months or ≈94 years.
// Use 600/50 (≈ 50 years each) — well within limits and effectively "until
// cancelled" since the webhook + cancel endpoint handle early termination.
const TOTAL_COUNT: Record<string, number> = { monthly: 600, yearly: 50 }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)
    if (!rateLimit(`sub:${user.id}`, 10, 60_000)) return json({ error: "too many requests" }, 429)

    const body = await safeJson(req)
    const plan = String(body?.plan ?? "").toLowerCase()
    const cycle = typeof body?.cycle === "string" ? body.cycle : "monthly"
    if (!PLANS[plan]) return json({ error: "unknown plan" }, 400)
    if (cycle !== "monthly" && cycle !== "yearly") {
      return json({ error: "lifetime is a one-time purchase (use /create-order)" }, 400)
    }

    const supabase = createSupabase()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, current_plan, subscription_status, billing_cycle, razorpay_subscription_id, full_name, email")
      .eq("id", user.id)
      .maybeSingle()

    const currentStatus = String(profile?.subscription_status ?? "NONE").toUpperCase()
    const existingSubId = profile?.razorpay_subscription_id ?? ""

    // ── Duplicate / reuse guard ──────────────────────────────────
    // ACTIVE + same plan/cycle → block (already subscribed).
    if (currentStatus === "ACTIVE" && existingSubId) {
      const samePlanCycle =
        String(profile?.current_plan ?? "").toUpperCase() === PLANS[plan].label &&
        String(profile?.billing_cycle ?? "").toLowerCase() === cycle
      if (samePlanCycle) return json({ error: "already subscribed — manage it from the subscription page" }, 409)
      if (String(profile?.billing_cycle ?? "").toUpperCase() === "LIFETIME") {
        return json({ error: "lifetime plan is already active" }, 409)
      }
    }

    // PENDING + existing subscription → check if it's still awaiting payment
    // at Razorpay. If so, reopen checkout with the same subscription_id instead
    // of creating an orphaned duplicate.
    if (currentStatus === "PENDING" && existingSubId) {
      try {
        const existing = await fetchSubscription(existingSubId)
        if (existing?.status === "created") {
          return json({
            key: getRazorpaySecrets().key,
            subscriptionId: existingSubId,
            amount: planAmount(plan, cycle),
            currency: "INR",
            plan: PLANS[plan].label,
            cycle,
            prefill: { name: profile?.full_name || "", email: profile?.email || "" },
          })
        }
        // Subscription is active / cancelled / other — fall through to create new.
      } catch (e) {
        console.error("create-subscription: reuse check failed:", e.message)
      }
    }

    // Replacing an active subscription (upgrade / cycle switch): stop future
    // charges on the old one at its cycle end — premium access never lapses.
    if (currentStatus === "ACTIVE" && existingSubId) {
      try {
        await cancelRazorpaySubscription(existingSubId)
      } catch (e) {
        // Not fatal — the old sub may already be cancelled; the new one is what matters.
        console.error("create-subscription: cancel old sub failed:", e.message)
      }
    }

    const planKey = `${plan}_${cycle}`
    const { id: planId, amount } = await getOrCreatePlan(supabase, planKey, plan, cycle)

    const sub = await rzpRequest("/subscriptions", "POST", {
      plan_id: planId,
      total_count: TOTAL_COUNT[cycle] ?? 1200,
      customer_notify: true,
      notes: { user_id: user.id, plan, cycle },
    })
    const subscriptionId = sub?.id ?? ""
    if (!subscriptionId) throw new Error("razorpay subscription creation failed")

    const { error: payErr } = await supabase.from("payments").insert({
      user_id: user.id,
      plan: PLANS[plan].label,
      cycle,
      amount,
      currency: "INR",
      razorpay_plan_id: planId,
      razorpay_subscription_id: subscriptionId,
      status: "pending",
    })
    if (payErr) throw payErr

    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        razorpay_subscription_id: subscriptionId,
        razorpay_plan_id: planId,
        billing_cycle: cycle === "yearly" ? "YEARLY" : "MONTHLY",
        subscription_status: "PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
    if (profErr) throw profErr

    return json({
      key: getRazorpaySecrets().key,
      subscriptionId,
      amount,
      currency: "INR",
      plan: PLANS[plan].label,
      cycle,
      prefill: { name: profile?.full_name || user.email || "", email: profile?.email || user.email || "" },
    })
  } catch (e) {
    console.error("create-subscription:", e.message)
    return json({ error: e.message }, 500)
  }
})
