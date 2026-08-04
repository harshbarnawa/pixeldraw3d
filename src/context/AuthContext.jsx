import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabase.js"
import { fetchProfile, minimalProfile } from "../lib/profiles.js"

// Exposes session + profile state to the whole app.
//   user    — raw Supabase auth user (or null for guests)
//   profile — row from public.profiles (or a local fallback)
//   loading — true until the initial session restore finishes
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const alive = useRef(true)

  const applyUser = useCallback(async (authUser) => {
    setUser(authUser)
    if (!authUser) {
      setProfile(null)
      return
    }
    // Prefer the DB row; fall back to a local minimal profile so the UI
    // never blanks out even before the migration trigger has run.
    const prof = await fetchProfile(authUser.id)
    if (alive.current) setProfile(prof ?? minimalProfile(authUser))
  }, [])

  // Session restore + live auth events (login, logout, token refresh).
  useEffect(() => {
    alive.current = true

    supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user ?? null)).finally(() => {
      if (alive.current) setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null)
      if (alive.current) setLoading(false)
    })

    return () => {
      alive.current = false
      data.subscription.unsubscribe()
    }
  }, [applyUser])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return null
    const prof = await fetchProfile(user.id)
    if (prof && alive.current) setProfile(prof)
    return prof
  }, [user])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAuthed: !!user,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signInWithGoogle, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
