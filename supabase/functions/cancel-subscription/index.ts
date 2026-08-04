// POST /cancel-subscription
//
// Marks the user's subscription as CANCELLED. Premium access continues until
// subscription_expires_at; the plan downgrades when the period lapses (a
// scheduled edge job / next verify step handles the actual expiry).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { authUser, createSupabase, json } from "../_shared/razorpay.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)

    const supabase = createSupabase()
    const { error } = await supabase
      .from("profiles")
      .update({ subscription_status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", user.id)
    if (error) throw error

    return json({ ok: true })
  } catch (e) {
    console.error("cancel-subscription:", e.message)
    return json({ error: e.message }, 500)
  }
})
