// Shared Razorpay helpers for the payment edge functions.
//
// The Razorpay SECRET key lives only in Supabase function secrets — never in
// the browser. Order/plan/subscription creation, signature verification and
// webhooks all happen server-side so the client can't forge a payment.
//
// Two payment models are supported:
//   * Recurring (monthly / yearly) — Razorpay Subscriptions, auto-charged via
//     a saved card. The webhook drives the lifecycle; verify-subscription only
//     gives instant UX after a server-side signature check + API confirmation.
//   * Lifetime — a one-time Order; no renewal, far-future expiry.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "./cors.ts"

// Amounts in paise. `plus`/`pro` are the Razorpay-safe plan keys; the DB stores
// the display label (PLUS / PRO). Lifetime is a one-time price, not a cycle.
export interface RazorpayPlan {
  label: string
  monthly: number
  yearly: number
  lifetime: number
}

export const PLANS: Record<string, RazorpayPlan> = {
  plus: { label: "PLUS", monthly: 9900, yearly: 99000, lifetime: 199900 },
  pro: { label: "PRO", monthly: 29900, yearly: 299000, lifetime: 499900 },
}

export function planAmount(plan: string, cycle: string) {
  const p = PLANS[plan]
  if (!p) return null
  if (cycle === "yearly") return p.yearly
  if (cycle === "lifetime") return p.lifetime
  return p.monthly
}

// How long one purchase grants access (a period-based licence; the recurring
// renewals extend it via webhook). Lifetime effectively never expires.
export function cycleDays(cycle: string) {
  if (cycle === "lifetime") return 36500
  return cycle === "yearly" ? 365 : 30
}

export function getRazorpaySecrets() {
  const key = Deno.env.get("RAZORPAY_KEY_ID") ?? ""
  const secret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? ""
  if (!key || !secret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in function secrets")
  }
  return { key, secret }
}

// Thin wrapper over the Razorpay REST API (basic auth with the key secret).
// Throws on non-2xx so callers can surface the Razorpay error description.
export async function rzpRequest(path: string, method = "GET", body?: unknown) {
  const { key, secret } = getRazorpaySecrets()
  const resp = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${key}:${secret}`),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(data?.error?.description ?? `razorpay ${method} ${path} failed (${resp.status})`)
  }
  return data
}

// Look up the cached Razorpay plan id for a (plan × cycle), creating + caching
// the plan on first use. Plans are immutable in Razorpay, so the cache makes
// creation idempotent and rebuildable.
export async function getOrCreatePlan(
  supabase: ReturnType<typeof createSupabase>,
  planKey: string,
  plan: string,
  cycle: string,
) {
  const { data: existing } = await supabase
    .from("razorpay_plans")
    .select("razorpay_plan_id, amount")
    .eq("plan_key", planKey)
    .maybeSingle()
  if (existing?.razorpay_plan_id) {
    return { id: existing.razorpay_plan_id, amount: existing.amount }
  }

  const amount = planAmount(plan, cycle)
  if (!amount) throw new Error("unknown plan/cycle")

  const created = await rzpRequest("/plans", "POST", {
    period: cycle, // "monthly" | "yearly"
    interval: 1,
    item: { name: `PixelDraw3D ${plan.toUpperCase()} ${cycle}`, amount, currency: "INR" },
  })
  const id = created?.id ?? ""
  if (!id) throw new Error("razorpay plan creation failed")

  const { error } = await supabase.from("razorpay_plans").upsert(
    { plan_key: planKey, plan, cycle, razorpay_plan_id: id, amount, currency: "INR" },
    { onConflict: "plan_key" },
  )
  if (error) throw error
  return { id, amount }
}

export async function fetchSubscription(subscriptionId: string) {
  return rzpRequest(`/subscriptions/${subscriptionId}`)
}

// Stop future auto-charges while keeping access until the current period ends.
export async function cancelRazorpaySubscription(subscriptionId: string) {
  return rzpRequest(`/subscriptions/${subscriptionId}/cancel`, "POST", { cancel_at_cycle_end: true })
}

// HMAC-SHA256 hex of `${orderId}|${paymentId}` with the key secret — the
// one-time Order signature.
export async function verifyPaymentSignature(secret: string, orderId: string, paymentId: string, signature: string) {
  return verifyHmac(secret, `${orderId}|${paymentId}`, signature)
}

// HMAC-SHA256 hex of `${paymentId}|${subscriptionId}` — the subscription
// signature. NOTE the field order differs from the order flow.
export async function verifySubscriptionSignature(
  secret: string,
  paymentId: string,
  subscriptionId: string,
  signature: string,
) {
  return verifyHmac(secret, `${paymentId}|${subscriptionId}`, signature)
}

// Razorpay webhooks sign the RAW request body with the webhook secret.
export async function verifyWebhookSignature(secret: string, rawBody: string, signature: string) {
  return verifyHmac(secret, rawBody, signature)
}

async function verifyHmac(secret: string, data: string, signature: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")
  return hex === signature
}

// Service-role client: bypasses RLS for the Edge Functions' own writes/reads.
export function createSupabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  })
}

// Resolve the caller's auth user from their Bearer token.
export async function authUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!token) return null
  const supabase = createSupabase()
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return null
  return data.user
}

// Human-friendly invoice number, e.g. INV-2026-00421. Non-colliding enough for
// display; the id column remains the real key.
export function invoiceNumber(now = new Date()) {
  return `INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0")}`
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Parse a JSON body safely; returns null on malformed input so callers can
// respond 400 instead of crashing with a 500.
export async function safeJson(req: Request) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

// Minimal per-instance in-memory rate limiter (fixed window). This blunts
// casual abuse of expensive endpoints; global per-project limits live in the
// Supabase + Razorpay dashboards. Keys are namespaced per user where possible.
const buckets = new Map<string, { count: number; resetAt: number }>()
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  b.count += 1
  return b.count <= limit
}
