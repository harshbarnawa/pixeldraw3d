import { useAuth } from "../context/AuthContext.jsx"

// On-theme prompt shown on protected pages when the visitor is a guest.
export default function LoginPrompt() {
  const { signInWithGoogle } = useAuth()
  return (
    <div className="login-card px-panel px-panel--pad">
      <span className="px-kicker">members only</span>
      <h2 className="px-section-title">log in to continue</h2>
      <p className="px-section-sub">this area is available to signed-in users.</p>
      <button type="button" className="px-btn google-btn" onClick={() => signInWithGoogle()}>
        ⌁ continue with google
      </button>
    </div>
  )
}
