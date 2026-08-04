import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"
import PlanBadge from "./PlanBadge.jsx"

// Navbar account area. Guests see a Google sign-in button; signed-in users
// see avatar + name + plan badge and an account dropdown.
export default function UserMenu() {
  const { profile, loading, signInWithGoogle, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  // close on outside click / escape
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (loading) return <div className="nav-user nav-user--skeleton" aria-hidden="true" />

  if (!profile) {
    return (
      <div className="nav-user">
        <button
          type="button"
          className="px-btn px-btn--sm nav-login"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await signInWithGoogle()
            } catch {
              setBusy(false)
            }
          }}
        >
          {busy ? "redirecting…" : "⌁ log in"}
        </button>
      </div>
    )
  }

  const display = profile.display_name || profile.username || "you"
  const initials = display.slice(0, 2).toUpperCase()
  const items = [
    { to: "/profile", label: "Profile" },
    { to: "/my-designs", label: "My Designs" },
    { to: "/subscribe", label: "Subscription" },
    { to: "/settings", label: "Settings" },
  ]

  return (
    <div className="nav-user" ref={ref}>
      <button
        type="button"
        className="user-btn"
        aria-expanded={open}
        aria-label="account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {profile.profile_photo ? (
          <img className="avatar" src={profile.profile_photo} alt="" />
        ) : (
          <span className="avatar avatar--fallback">{initials}</span>
        )}
        <span className="user-name">{display}</span>
        <PlanBadge plan={profile.current_plan} />
        <span className="user-caret">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="dropdown">
          <div className="dropdown-head">
            <div className="dropdown-name">{display}</div>
            <div className="dropdown-sub">@{profile.username}</div>
            <PlanBadge plan={profile.current_plan} />
          </div>
          <ul className="dropdown-list">
            {items.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="dropdown-item" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="dropdown-item dropdown-item--danger"
                onClick={async () => {
                  setOpen(false)
                  try {
                    await signOut()
                  } catch {
                    /* ignore — session restore handles the rest */
                  }
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
