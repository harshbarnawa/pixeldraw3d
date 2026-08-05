// POST /verify-subscription  { subscriptionId, paymentId, signature }
//
// Verifies the Razorpay subscription payment signature server-side
// (HMAC-SHA256 of `${paymentId}|${subscriptionId}`), confirms the subscription
// is really active at Razorpay, then flips the pending payment + invoice to
// paid and activates the subscription on the profile. The client callback is
// never trusted on its own — the signature check + Razorpay API confirmations
// are the gate, and the webhook stays the source of truth for what happens
// after (renewals, cancellations).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  authUser,
  createSupabase,
  cycleDays,
  fetchSubscription,
  getRazorpaySecrets,
  invoiceNumber,
  json,
  rateLimit,
  rzpRequest,
  safeJson,
  verifySubscriptionSignature,
} from "../_shared/razorpay.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)
    if (!rateLimit(`vsub:${user.id}`, 20, 60_000)) return json({ error: "too many requests" }, 429)

    const body = await safeJson(req)
    const subscriptionId = typeof body?.subscriptionId === "string" ? body.subscriptionId : ""
    const paymentId = typeof body?.paymentId === "string" ? body.paymentId : ""
    const signature = typeof body?.signature === "string" ? body.signature : ""
    if (!subscriptionId || !paymentId || !signature) return json({ error: "missing payment details" }, 400)

    const { secret } = getRazorpaySecrets()
    const valid = await verifySubscriptionSignature(secret, paymentId, subscriptionId, signature)
    if (!valid) return json({ error: "signature mismatch" }, 400)

    // Confirm with Razorpay that this subscription is real + read customer_id.
    const sub = await fetchSubscription(subscriptionId)
    const subStatus = String(sub?.status ?? "").toLowerCase()
    if (!["active", "authenticated", "pending"].includes(subStatus)) {
      return json({ error: `subscription is not active (${subStatus})` }, 409)
    }
    let customerId = sub?.customer_id ?? ""

    const supabase = createSupabase()
    const { data: payment } = await supabase
      .from("payments")
      .select()
      .eq("razorpay_subscription_id", subscriptionId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle()
    if (!payment) return json({ error: "order not found" }, 404)

    // Plan/cycle come from the stored payment row, never from the client body.
    const plan = payment.plan
    const cycle = payment.cycle
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + cycleDays(cycle))

    // Best-effort enrichment: invoice id + hosted URL + customer id from Razorpay.
    let invoiceId = ""
    let invoiceUrl = ""
    try {
      const rzpPayment = await rzpRequest(`/payments/${paymentId}`)
      invoiceId = rzpPayment?.invoice_id ?? ""
      customerId = customerId || (rzpPayment?.customer_id ?? "")
      if (invoiceId) {
        const rzpInvoice = await rzpRequest(`/invoices/${invoiceId}`)
        invoiceUrl = rzpInvoice?.short_url ?? ""
      }
    } catch (e) {
      console.error("verify-subscription: enrichment failed:", e.message)
    }

    const { error: payErr } = await supabase
      .from("payments")
      .update({
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        razorpay_invoice_id: invoiceId,
        invoice_url: invoiceUrl,
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
      invoice_number: invoiceNumber(now),
      plan,
      cycle,
      amount: payment.amount,
      currency: payment.currency,
      status: "paid",
      issued_at: now.toISOString(),
      razorpay_invoice_id: invoiceId,
      invoice_url: invoiceUrl,
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
        razorpay_customer_id: customerId,
        razorpay_subscription_id: subscriptionId,
        updated_at: now.toISOString(),
      })
      .eq("id", user.id)
    if (profErr) throw profErr

    return json({ ok: true, plan, expiresAt: periodEnd.toISOString() })
  } catch (e) {
    console.error("verify-subscription:", e.message)
    return json({ error: e.message }, 500)
  }
})
