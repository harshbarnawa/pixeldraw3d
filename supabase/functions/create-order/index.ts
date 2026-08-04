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
} from "../_shared/razorpay.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)

    const { plan, cycle = "monthly" } = await req.json()
    const planKey = String(plan).toLowerCase() // client sends PLUS/PRO, PLANS keys are plus/pro
    if (!PLANS[planKey]) return json({ error: "unknown plan" }, 400)
    const amount = planAmount(planKey, cycle)
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
        notes: { plan: planKey, cycle, user_id: user.id },
      }),
    })
    const order = await resp.json()
    if (!resp.ok || order.error) {
      throw new Error(order.error?.description ?? "razorpay order creation failed")
    }

    const supabase = createSupabase()
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      plan: PLANS[planKey].label,
      cycle,
      amount,
      currency: "INR",
      razorpay_order_id: order.id,
      status: "pending",
    })
    if (error) throw error

    return json({ key, orderId: order.id, amount: order.amount, currency: order.currency, plan: PLANS[planKey].label, cycle })
  } catch (e) {
    console.error("create-order:", e.message)
    return json({ error: e.message }, 500)
  }
})
