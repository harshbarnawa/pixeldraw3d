// POST /delete-account
//
// Permanently deletes the caller's auth user via the admin API. The user's
// profile, designs, payments and invoices all cascade (every table FKs auth.users
// with ON DELETE CASCADE). Uses the service-role key — the anon key can't call
// admin.deleteUser, so a client can only ever delete its own account.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { authUser, createSupabase, json } from "../_shared/razorpay.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const user = await authUser(req)
    if (!user) return json({ error: "unauthorized" }, 401)

    const supabase = createSupabase()
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw error

    return json({ ok: true })
  } catch (e) {
    console.error("delete-account:", e.message)
    return json({ error: e.message }, 500)
  }
})
