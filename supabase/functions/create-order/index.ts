// POST /create-order  { plan, cycle }
//
// Authenticates the caller, creates a Razorpay order server-side (so the
// amount can't be tampered with), records a pending payment row and returns
// the checkout payload. The Razorpay secret never leaves the server.

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
    const cycle = typeof body?.cycle === "string" ? body.cycle : "monthly"
    if (!PLANS[plan]) return json({ error: "unknown plan" }, 400)
    const amount = planAmount(plan, cycle)
    if (!amount) return json({ error: "unknown cycle" }, 400)

    const { key, secret } = getRazorpaySecrets()
    const resp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${key}:${secret}`),
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `pd3d-${user.id.slice(0, 8)}-${Date.now()}`,
        notes: { plan: plan, cycle, user_id: user.id },
      }),
    })
    const order = await resp.json()
    if (!resp.ok || order.error) {
      throw new Error(order.error?.description ?? "razorpay order creation failed")
    }

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
