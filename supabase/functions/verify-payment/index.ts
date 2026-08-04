// POST /verify-payment  { orderId, paymentId, signature, plan, cycle }
//
// Verifies the Razorpay payment signature server-side (HMAC-SHA256 with the
// key secret), then flips the payment + invoice to paid and activates the
// subscription on the user's profile. The client callback is never trusted on
// its own — this signature check is the source of truth.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  authUser,
  createSupabase,
  cycleDays,
  getRazorpaySecrets,
  json,
  rateLimit,
  safeJson,
  verifyPaymentSignature,
} from "../_shared/razorpay.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)
    if (!rateLimit(`verify:${user.id}`, 20, 60_000)) return json({ error: "too many requests" }, 429)

    const body = await safeJson(req)
    const orderId = typeof body?.orderId === "string" ? body.orderId : ""
    const paymentId = typeof body?.paymentId === "string" ? body.paymentId : ""
    const signature = typeof body?.signature === "string" ? body.signature : ""
    if (!orderId || !paymentId || !signature) return json({ error: "missing payment details" }, 400)

    const { secret } = getRazorpaySecrets()
    const valid = await verifyPaymentSignature(secret, orderId, paymentId, signature)
    if (!valid) return json({ error: "signature mismatch" }, 400)

    const supabase = createSupabase()
    const { data: payment } = await supabase
      .from("payments")
      .select()
      .eq("razorpay_order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!payment) return json({ error: "order not found" }, 404)

    // The plan/cycle come from the stored order, never from the client body.
    const plan = payment.plan
    const cycle = payment.cycle
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + cycleDays(cycle))

    const { error: payErr } = await supabase
      .from("payments")
      .update({
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        status: "paid",
        signature_verified: true,
        verified_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", payment.id)
    if (payErr) throw payErr

    const { error: invErr } = await supabase.from("invoices").insert({
      payment_id: payment.id,
      user_id: user.id,
      invoice_number: `INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0")}`,
      plan,
      cycle,
      amount: payment.amount,
      currency: payment.currency,
      status: "paid",
      issued_at: now.toISOString(),
    })
    if (invErr) throw invErr

    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        current_plan: plan,
        subscription_status: "ACTIVE",
        billing_cycle: cycle === "yearly" ? "YEARLY" : "MONTHLY",
        subscription_expires_at: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
      })
      .eq("id", user.id)
    if (profErr) throw profErr

    return json({ ok: true, plan, expiresAt: periodEnd.toISOString() })
  } catch (e) {
    console.error("verify-payment:", e.message)
    return json({ error: e.message }, 500)
  }
})
