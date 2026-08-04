import { createClient } from "@supabase/supabase-js"

// Supabase browser client.
//
// The ANON key is safe to ship to the browser — Supabase Row Level Security
// (RLS) protects the data behind it. The SERVICE-ROLE key is never used here:
// it lives in .env.local and later in Supabase Edge Function secrets, for
// server-side work only.
//
// This module is imported lazily where it is needed (auth, cloud designs,
// community) so it never runs during a plain render of the editor.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local"
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Single source of truth for auth/session state used across the app.
export const AUTH_EVENT = "supabase-auth-event"

// Tracks whether the user is currently logged in or a guest. Exported helper so
// components can subscribe without importing supabase directly.
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session, session)
  })
  return data.subscription.unsubscribe
}
