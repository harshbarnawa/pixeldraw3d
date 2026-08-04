// Shared Razorpay helpers for the payment edge functions.
//
// The Razorpay SECRET key lives only in Supabase function secrets — never in
// the browser. Order creation, signature verification and webhooks all happen
// server-side so the client can't forge a payment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "./cors.ts"

// Amounts in paise. `plus`/`pro` are the Razorpay-safe plan keys; the DB stores
// the display label (PLUS / PRO).
export const PLANS = {
  plus: { label: "PLUS", monthly: 9900, yearly: 99000 },
  pro: { label: "PRO", monthly: 29900, yearly: 299000 },
} as const

export function planAmount(plan: string, cycle: string) {
  const p = PLANS[plan]
  if (!p) return null
  return cycle === "yearly" ? p.yearly : p.monthly
}

// How long one purchase grants access (a period-based licence; recurring
// auto-renewal can layer Razorpay Subscriptions on later).
export function cycleDays(cycle: string) {
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

// HMAC-SHA256 of `${orderId}|${paymentId}` with the key secret, as a hex string.
export async function verifyPaymentSignature(secret: string, orderId: string, paymentId: string, signature: string) {
  return verifyHmac(secret, `${orderId}|${paymentId}`, signature)
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

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
