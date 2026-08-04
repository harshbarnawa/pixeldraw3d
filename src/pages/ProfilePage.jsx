import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import RequireAuth from "../components/RequireAuth.jsx"
import PlanBadge from "../components/PlanBadge.jsx"
import { useAuth } from "../context/AuthContext.jsx"

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"

export default function ProfilePage() {
  return (
    <PageShell>
      <RequireAuth>
        <ProfileInner />
      </RequireAuth>
    </PageShell>
  )
}

function ProfileInner() {
  const { profile } = useAuth()
  const initials = (profile?.display_name || profile?.username || "?").slice(0, 2).toUpperCase()

  return (
    <div className="px-page">
      <SectionHead kicker="01 · account" title="profile" sub="your public identity on pixeldraw3d." />
      <div className="px-panel px-panel--pad profile-card">
        {profile?.profile_photo ? (
          <img className="profile-avatar" src={profile.profile_photo} alt="" />
        ) : (
          <span className="profile-avatar profile-avatar--fallback">{initials}</span>
        )}
        <div className="profile-meta">
          <div className="profile-name">
            {profile?.display_name || "you"} <PlanBadge plan={profile?.current_plan} />
          </div>
          <div className="muted">@{profile?.username}</div>
          <div className="muted">{profile?.email}</div>
          <div className="profile-rows">
            <div>
              <span className="px-label">provider</span>
              {profile?.provider || "—"}
            </div>
            <div>
              <span className="px-label">member since</span>
              {fmtDate(profile?.created_at)}
            </div>
            <div>
              <span className="px-label">last login</span>
              {fmtDate(profile?.last_login)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
