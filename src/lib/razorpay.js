// Client-side Razorpay checkout.
//
// Two flows, decided entirely server-side:
//   * Recurring (monthly / yearly) — Razorpay Subscriptions. The edge function
//     creates the subscription; checkout opens with `subscription_id`, which
//     saves the card token and collects the first payment. Renewals are handled
//     by Razorpay + the webhook, no client involved.
//   * Lifetime — a one-time Order, opened + verified like before.
//
// Nothing here is trusted for billing: the amount/plan are decided server-side,
// and every callback is verified again by an edge function (signature check +
// Razorpay API confirmation) before anything is activated. All Supabase calls
// go through supabase.functions.invoke, which attaches the user's JWT.

import { supabase } from "./supabase.js"

const EDGE_NAMES = {
  createOrder: "create-order",
  verifyPayment: "verify-payment",
  createSubscription: "create-subscription",
  verifySubscription: "verify-subscription",
  cancel: "cancel-subscription",
  deleteAccount: "delete-account",
}

async function invokeEdge(name, body) {
  if (!supabase) throw new Error("supabase is not configured")
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw new Error(error.context?.message ?? error.message ?? `edge function ${name} failed`)
  if (data?.error) throw new Error(data.error)
  return data
}

// Load the Razorpay checkout script once, then resolve with window.Razorpay.
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay)
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay))
      return
    }
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.async = true
    s.onload = () => resolve(window.Razorpay)
    s.onerror = () => reject(new Error("couldn't load razorpay"))
    document.body.appendChild(s)
  })
}

// Full flow: create the checkout server-side → open Razorpay modal → verify on
// success. Resolves with { status, data } where status is "paid" | "dismissed" | "error".
export async function startCheckout({ plan, cycle = "monthly", contact, refreshProfile, onActivated }) {
  const Razorpay = await loadRazorpay()
  const isRecurring = cycle === "monthly" || cycle === "yearly"

  // Server decides the amount/plan/subscription — never trust the client here.
  const checkout = isRecurring
    ? await invokeEdge(EDGE_NAMES.createSubscription, { plan, cycle })
    : await invokeEdge(EDGE_NAMES.createOrder, { plan, cycle })

  return new Promise((resolve, reject) => {
    let settled = false
    const done = (status, data) => {
      if (settled) return
      settled = true
      resolve({ status, data })
    }

    const handler = async (response) => {
      try {
        // Verify server-side: subscription flow uses the subscription signature,
        // the order flow the order signature. The client callback is never enough.
        const res = isRecurring
          ? await invokeEdge(EDGE_NAMES.verifySubscription, {
              subscriptionId: response.razorpay_subscription_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
          : await invokeEdge(EDGE_NAMES.verifyPayment, {
              plan,
              cycle,
              orderId: checkout.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
        refreshProfile?.()
        onActivated?.(res)
        done("paid", res)
      } catch (e) {
        done("error", e)
      }
    }

    const options = isRecurring
      ? {
          key: checkout.key,
          subscription_id: checkout.subscriptionId,
          name: "PixelDraw3D",
          description: `${checkout.plan} · ${checkout.cycle}`,
          prefill: { ...checkout.prefill, contact: contact || undefined },
          theme: { color: "#8b7cf6" },
          handler,
          modal: { ondismiss: () => done("dismissed") },
        }
      : {
          key: checkout.key,
          amount: checkout.amount,
          currency: checkout.currency,
          name: "PixelDraw3D",
          description: `${checkout.plan} · ${checkout.cycle}`,
          order_id: checkout.orderId,
          theme: { color: "#8b7cf6" },
          prefill: { ...checkout.prefill, contact: contact || undefined },
          handler,
          modal: { ondismiss: () => done("dismissed") },
        }

    const rzp = new Razorpay(options)
    rzp.on("payment.failed", (resp) => done("error", resp?.error?.description ?? "payment failed"))
    rzp.open()
  })
}

export function cancelSubscription() {
  return invokeEdge(EDGE_NAMES.cancel, {})
}

export function deleteAccount() {
  return invokeEdge(EDGE_NAMES.deleteAccount, {})
}

// Billing history for the UI — reads only the caller's rows via RLS.
export async function fetchBilling(userId) {
  if (!supabase) return { payments: [], invoices: [] }
  const [paymentsRes, invoicesRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id, plan, cycle, amount, currency, status, verified_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("invoices")
      .select("id, invoice_number, plan, cycle, amount, currency, status, issued_at")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false })
      .limit(50),
  ])
  return { payments: paymentsRes.data ?? [], invoices: invoicesRes.data ?? [] }
}
