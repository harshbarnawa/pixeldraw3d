// Client-side Razorpay checkout.
//
// Nothing here is trusted for billing: an order is created server-side (the
// amount is decided there), the checkout opens with that order id, and the
// payment callback is verified again by the verify-payment edge function using
// the signature. All Supabase calls go through supabase.functions.invoke, which
// attaches the user's JWT automatically.

import { supabase } from "./supabase.js"

const EDGE_NAMES = {
  createOrder: "create-order",
  verifyPayment: "verify-payment",
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

// Full flow: create order server-side → open Razorpay modal → verify on success.
// Resolves with { status, data } where status is "paid" | "dismissed".
export async function startCheckout({ plan, cycle = "monthly", refreshProfile, onActivated }) {
  const order = await invokeEdge(EDGE_NAMES.createOrder, { plan, cycle })
  const Razorpay = await loadRazorpay()

  return new Promise((resolve, reject) => {
    let settled = false
    const done = (status, data) => {
      if (settled) return
      settled = true
      resolve({ status, data })
    }

    const rzp = new Razorpay({
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      name: "PixelDraw3D",
      description: `${order.plan} · ${cycle}`,
      order_id: order.orderId,
      theme: { color: "#8b7cf6" },
      handler: async (response) => {
        try {
          const res = await invokeEdge(EDGE_NAMES.verifyPayment, {
            plan,
            cycle,
            orderId: order.orderId,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
          refreshProfile?.()
          onActivated?.(res)
          done("paid", res)
        } catch (e) {
          done("error", e)
        }
      },
      modal: {
        ondismiss: () => done("dismissed"),
      },
    })

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
