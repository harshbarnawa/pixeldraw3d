// POST /razorpay-webhook
//
// Listens for Razorpay subscription + payment events and mirrors them into the
// payments / invoices / profiles tables. This is the SOURCE OF TRUTH for the
// subscription lifecycle — renewals, cancellations, failures and refunds are
// all applied here, not from client callbacks.
//
// Secured by the webhook secret: Razorpay signs the RAW request body with the
// RAZORPAY_WEBHOOK_SECRET you configure in the Razorpay dashboard, and we
// compare that against our own HMAC before trusting anything.
//
// Idempotent: every event is recorded by its event.id in webhook_events first;
// a duplicate delivery is a no-op. Payment rows are also keyed by
// razorpay_payment_id so `payment.captured` and `subscription.charged` for the
// same charge can't create two rows.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createSupabase, cycleDays, invoiceNumber, json, verifyWebhookSignature } from "../_shared/razorpay.ts"

// Preferred period end: the subscription's authoritative current_end from
// Razorpay, else computed from the cycle (e.g. a charge that arrives before the
// subscription entity does).
function periodEnd(subscription: any, cycle: string) {
  const unixEnd = Number(subscription?.current_end)
  if (unixEnd > 0) {
    const d = new Date(unixEnd * 1000)
    if (!Number.isNaN(d.getTime())) return d
  }
  const d = new Date()
  d.setDate(d.getDate() + cycleDays(cycle))
  return d
}

// Upsert a successful charge: mark the pending first payment paid, or create a
// renewal payment row, plus the invoice, plus extend the profile expiry.
async function recordCharge(
  supabase: ReturnType<typeof createSupabase>,
  opts: {
    userId: string
    plan: string
    cycle: string
    subscriptionId?: string
    orderId?: string
    paymentId?: string
    invoiceId?: string
    invoiceUrl?: string
    amount?: number
    currency?: string
    subscription: any
    at: string
  },
) {
  const {
    userId,
    plan,
    cycle,
    subscriptionId = "",
    orderId = "",
    paymentId = "",
    invoiceId = "",
    invoiceUrl = "",
    amount,
    currency = "INR",
    subscription,
    at,
  } = opts

  // 1. Find or create the payment row. Match the same charge however it's
  // keyed: by payment id (re-delivery of a verified charge), by the pending
  // subscription payment, or by the pending one-time order — so the webhook
  // racing the client callback can't create a duplicate row.
  let paymentRow: any = null
  if (paymentId) {
    const { data } = await supabase.from("payments").select().eq("razorpay_payment_id", paymentId).maybeSingle()
    if (data) {
      paymentRow = data
    } else if (subscriptionId) {
      const { data: pend } = await supabase
        .from("payments")
        .select()
        .eq("razorpay_subscription_id", subscriptionId)
        .eq("status", "pending")
        .maybeSingle()
      if (pend) paymentRow = pend
    } else if (orderId) {
      const { data: pend } = await supabase
        .from("payments")
        .select()
        .eq("razorpay_order_id", orderId)
        .eq("status", "pending")
        .maybeSingle()
      if (pend) paymentRow = pend
    }
  }

  // A matched payment row (the pending first payment) carries the authoritative
  // plan/cycle stamped at create-subscription — prefer those over the profile's
  // (which is still FREE before verification runs).
  const chargePlan = paymentRow?.plan || plan
  const chargeCycle = paymentRow?.cycle || cycle

  if (paymentRow) {
    await supabase
      .from("payments")
      .update({
        status: "paid",
        razorpay_payment_id: paymentId || paymentRow.razorpay_payment_id,
        razorpay_invoice_id: invoiceId,
        invoice_url: invoiceUrl,
        signature_verified: true,
        verified_at: at,
        updated_at: at,
      })
      .eq("id", paymentRow.id)
  } else {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        plan: chargePlan,
        cycle: chargeCycle,
        amount: amount ?? 0,
        currency,
        razorpay_payment_id: paymentId || null,
        razorpay_subscription_id: subscriptionId || null,
        razorpay_invoice_id: invoiceId,
        invoice_url: invoiceUrl,
        status: "paid",
        signature_verified: true,
        verified_at: at,
      })
      .select()
      .single()
    if (error) throw error
    paymentRow = data
  }

  // 2. Invoice row (one per payment id).
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("payment_id", paymentRow.id)
    .maybeSingle()
  if (existingInvoice) {
    if (invoiceId) {
      await supabase
        .from("invoices")
        .update({ razorpay_invoice_id: invoiceId, invoice_url: invoiceUrl })
        .eq("id", existingInvoice.id)
    }
  } else {
    await supabase.from("invoices").insert({
      payment_id: paymentRow.id,
      user_id: userId,
      invoice_number: invoiceNumber(),
      plan: chargePlan,
      cycle: chargeCycle,
      amount: paymentRow.amount,
      currency,
      status: "paid",
      issued_at: at,
      razorpay_invoice_id: invoiceId,
      invoice_url: invoiceUrl,
    })
  }

  // 3. Activate + extend the profile's access. current_plan is set here so a
  // charge that wins the race against the client callback still unlocks the
  // right plan (the webhook is the source of truth).
  const end = periodEnd(subscription, chargeCycle).toISOString()
  await supabase
    .from("profiles")
    .update({
      current_plan: chargePlan,
      subscription_status: "ACTIVE",
      subscription_expires_at: end,
      next_billing_date: end,
      updated_at: at,
    })
    .eq("id", userId)
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  const supabase = createSupabase()
  let recordedEventId = ""
  try {
    const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? ""
    if (!secret) return json({ error: "RAZORPAY_WEBHOOK_SECRET not set" }, 500)

    const rawBody = await req.text()
    const signature = req.headers.get("x-razorpay-signature") ?? ""
    if (!(await verifyWebhookSignature(secret, rawBody, signature))) return json({ error: "bad signature" }, 401)

    const event = JSON.parse(rawBody)
    const eventId = String(event?.id ?? "")
    const eventType = String(event?.event ?? "")
    if (!eventId || !eventType) return json({ ok: true })

    const now = new Date().toISOString()

    // Idempotency ledger: a unique conflict on id means we already processed it.
    const { error: dupErr } = await supabase.from("webhook_events").insert({
      id: eventId,
      event_type: eventType,
      payload: event,
    })
    if (dupErr?.code === "23505") return json({ ok: true })
    recordedEventId = eventId

    const payment = event.payload?.payment?.entity ?? {}
    const subscription = event.payload?.subscription?.entity ?? {}
    const invoice = event.payload?.invoice?.entity ?? {}
    const subId = payment.subscription_id ?? subscription.id ?? ""
    const orderId = payment.order_id ?? ""
    const paymentId = payment.id ?? ""

    // Resolve the user + cycle. Recurring events map via subscription id
    // (profile link or the notes.user_id we stamped at creation); one-time
    // order events map via the pending payment row.
    let userId = ""
    let cycle = "monthly"
    let plan = "PLUS"
    if (subId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, current_plan, billing_cycle")
        .eq("razorpay_subscription_id", subId)
        .maybeSingle()
      if (prof) {
        userId = prof.id
        plan = prof.current_plan
        cycle = String(prof.billing_cycle ?? "MONTHLY").toLowerCase()
      } else if (subscription?.notes?.user_id) {
        userId = subscription.notes.user_id
      }
    } else if (orderId) {
      const { data: pay } = await supabase
        .from("payments")
        .select("user_id, plan, cycle")
        .eq("razorpay_order_id", orderId)
        .maybeSingle()
      if (pay) {
        userId = pay.user_id
        plan = pay.plan
        cycle = pay.cycle ?? "lifetime"
      }
    }

    const amount = typeof payment.amount === "number" ? payment.amount : undefined
    const invoiceId = invoice.id ?? payment.invoice_id ?? ""
    const invoiceUrl = invoice.short_url ?? ""

    switch (eventType) {
      // ---- successful charge (first payment or renewal) ----
      case "subscription.charged":
      case "payment.captured": {
        if (!userId) break
        await recordCharge(supabase, {
          userId,
          plan,
          cycle,
          subscriptionId: subId,
          orderId,
          paymentId,
          invoiceId,
          invoiceUrl,
          amount,
          currency: payment.currency ?? "INR",
          subscription,
          at: now,
        })
        break
      }

      // ---- lifecycle status transitions (subscription id must match OURS) ----
      case "subscription.activated": {
        if (!userId) break
        await supabase
          .from("profiles")
          .update({
            subscription_status: "ACTIVE",
            subscription_expires_at: periodEnd(subscription, cycle).toISOString(),
            next_billing_date: periodEnd(subscription, cycle).toISOString(),
            razorpay_customer_id: subscription.customer_id || undefined,
            updated_at: now,
          })
          .eq("id", userId)
        break
      }
      case "subscription.authenticated":
      case "subscription.pending": {
        if (!userId) break
        await supabase
          .from("profiles")
          .update({ subscription_status: "PENDING", updated_at: now })
          .eq("id", userId)
        break
      }
      case "subscription.cancelled": {
        if (!userId) break
        // Premium continues until the period end; the expiry sweep downgrades.
        await supabase
          .from("profiles")
          .update({
            subscription_status: "CANCELLED",
            subscription_expires_at: periodEnd(subscription, cycle).toISOString(),
            updated_at: now,
          })
          .eq("id", userId)
        break
      }
      case "subscription.completed": {
        if (!userId) break
        await supabase
          .from("profiles")
          .update({
            subscription_status: "COMPLETED",
            subscription_expires_at: periodEnd(subscription, cycle).toISOString(),
            updated_at: now,
          })
          .eq("id", userId)
        break
      }

      // ---- payment failure / refund ----
      case "payment.failed": {
        if (paymentId) {
          await supabase
            .from("payments")
            .update({ status: "failed", razorpay_payment_id: paymentId, updated_at: now })
            .eq("razorpay_payment_id", paymentId)
        } else if (userId) {
          await supabase
            .from("payments")
            .update({ status: "failed", updated_at: now })
            .eq("user_id", userId)
            .eq("status", "pending")
        }
        // A failed renewal puts the subscription into retry; the dashboard may
        // then send subscription.pending / subscription.halted. Reflect retry.
        if (userId) {
          await supabase.from("profiles").update({ subscription_status: "PENDING", updated_at: now }).eq("id", userId)
        }
        break
      }
      case "refund.processed": {
        if (paymentId) {
          await supabase
            .from("payments")
            .update({ status: "refunded", updated_at: now })
            .eq("razorpay_payment_id", paymentId)
        }
        break
      }

      default:
        // Unknown event — recorded in the ledger, nothing to do.
        break
    }

    return json({ ok: true })
  } catch (e) {
    // A failed process must not be swallowed as "already handled": remove the
    // ledger row so Razorpay's retry re-processes the event cleanly.
    if (recordedEventId) {
      try {
        await supabase.from("webhook_events").delete().eq("id", recordedEventId)
      } catch {
        // best-effort — the retry is not blocked if the cleanup fails
      }
    }
    console.error("razorpay-webhook:", e.message)
    return json({ error: e.message }, 500)
  }
})
