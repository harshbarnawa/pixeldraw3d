// Profile (public.profiles) helpers — fetching and minimal fallbacks.
// The profiles row is created server-side by the handle_new_user trigger;
// these helpers only read it.

import { supabase } from "./supabase.js"

// Column mapping: DB uses snake_case, the app reads it as-is.
export function selectProfile() {
  return supabase.from("profiles").select("*")
}

export async function fetchProfile(userId) {
  const { data, error } = await selectProfile().eq("id", userId).maybeSingle()
  if (error) {
    console.error("fetchProfile failed:", error.message)
    return null
  }
  return data
}

// Local fallback used when the trigger has not run yet (e.g. migration not
// applied) so the auth UI still works. Never persisted.
export function minimalProfile(user) {
  const meta = user?.user_metadata ?? {}
  return {
    id: user?.id,
    full_name: meta.full_name ?? meta.name ?? "",
    display_name: meta.full_name ?? meta.name ?? user?.email ?? "",
    username: (user?.email ?? "user").split("@")[0],
    email: user?.email ?? "",
    profile_photo: meta.avatar_url ?? meta.picture ?? "",
    provider: "google",
    current_plan: "FREE",
    cloud_designs_used: 0,
    cloud_designs_limit: 5,
    image_imports_used: 0,
    image_imports_limit: 2,
    subscription_status: "NONE",
    billing_cycle: "MONTHLY",
    created_at: user?.created_at,
    last_login: user?.last_sign_in_at,
  }
}
