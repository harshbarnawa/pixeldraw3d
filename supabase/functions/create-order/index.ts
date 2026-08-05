// POST /create-order  { plan, cycle: "lifetime" }
//
// Authenticates the caller, creates a one-time Razorpay order server-side (so
// the amount can't be tampered with), records a pending payment row and returns
// the checkout payload. The Razorpay secret never leaves the server.
//
// This endpoint is now the LIFETIME path only — recurring monthly/yearly billing
// goes through /create-subscription (Razorpay Subscriptions).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  PLANS,
  authUser,
  createSupabase,
  getRazorpaySecrets,
  json,
  planAmount,
  rateLimit,
  rzpRequest,
  safeJson,
} from "../_shared/razorpay.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)
    if (!rateLimit(`order:${user.id}`, 10, 60_000)) return json({ error: "too many requests" }, 429)

    const body = await safeJson(req)
    const plan = String(body?.plan ?? "").toLowerCase() // client sends PLUS/PRO, PLANS keys are plus/pro
    const cycle = typeof body?.cycle === "string" ? body.cycle : "lifetime"
    if (!PLANS[plan]) return json({ error: "unknown plan" }, 400)
    if (cycle !== "lifetime") {
      return json({ error: "monthly/yearly are recurring — use /create-subscription" }, 400)
    }
    const amount = planAmount(plan, cycle)
    if (!amount) return json({ error: "unknown cycle" }, 400)

    const { key } = getRazorpaySecrets()
    const order = await rzpRequest("/orders", "POST", {
      amount,
      currency: "INR",
      receipt: `pd3d-${user.id.slice(0, 8)}-${Date.now()}`,
      notes: { plan, cycle, user_id: user.id },
    })

    const supabase = createSupabase()
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      plan: PLANS[plan].label,
      cycle,
      amount,
      currency: "INR",
      razorpay_order_id: order.id,
      status: "pending",
    })
    if (error) throw error

    return json({ key, orderId: order.id, amount: order.amount, currency: order.currency, plan: PLANS[plan].label, cycle })
  } catch (e) {
    console.error("create-order:", e.message)
    return json({ error: e.message }, 500)
  }
})
