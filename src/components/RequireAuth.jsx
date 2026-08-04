import { useAuth } from "../context/AuthContext.jsx"
import LoginPrompt from "./LoginPrompt.jsx"

// Guards account-only routes. Guests see the login prompt instead of the page.
export default function RequireAuth({ children }) {
  const { isAuthed, loading } = useAuth()
  if (loading) return <div className="auth-loading" aria-hidden="true" />
  if (!isAuthed) return <LoginPrompt />
  return children
}
