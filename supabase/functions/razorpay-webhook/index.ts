// POST /razorpay-webhook
//
// Listens for Razorpay payment events (payment.captured / payment.failed /
// refund.processed) and mirrors them into the payments + invoices tables.
//
// Secured by the webhook secret: Razorpay signs the RAW request body with the
// RAZORPAY_WEBHOOK_SECRET you configure in the Razorpay dashboard, and we
// compare that against our own HMAC before trusting anything. Client-side
// callbacks are never the source of truth.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createSupabase, json, verifyWebhookSignature } from "../_shared/razorpay.ts"

serve(async (req) => {
  try {
    const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? ""
    if (!secret) {
      return json({ error: "RAZORPAY_WEBHOOK_SECRET not set" }, 500)
    }

    const rawBody = await req.text()
    const signature = req.headers.get("x-razorpay-signature") ?? ""
    if (!(await verifyWebhookSignature(secret, rawBody, signature))) {
      return json({ error: "bad signature" }, 401)
    }

    const event = JSON.parse(rawBody)
    const payment = event.payload?.payment?.entity
    const orderId = payment?.order_id
    if (!payment || !orderId) return json({ ok: true })

    const supabase = createSupabase()
    const now = new Date().toISOString()

    switch (event.event) {
      case "payment.captured": {
        const { data } = await supabase
          .from("payments")
          .update({
            status: "paid",
            razorpay_payment_id: payment.id,
            updated_at: now,
          })
          .eq("razorpay_order_id", orderId)
          .select("id")
        if (data?.[0]) {
          await supabase.from("invoices").update({ status: "paid" }).eq("payment_id", data[0].id)
        }
        break
      }
      case "payment.failed": {
        await supabase
          .from("payments")
          .update({ status: "failed", razorpay_payment_id: payment.id, updated_at: now })
          .eq("razorpay_order_id", orderId)
        break
      }
      case "refund.processed": {
        await supabase
          .from("payments")
          .update({ status: "refunded", razorpay_payment_id: payment.id, updated_at: now })
          .eq("razorpay_order_id", orderId)
        break
      }
      default:
        break
    }

    return json({ ok: true })
  } catch (e) {
    console.error("razorpay-webhook:", e.message)
    return json({ error: e.message }, 500)
  }
})
