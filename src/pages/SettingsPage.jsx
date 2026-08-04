import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import RequireAuth from "../components/RequireAuth.jsx"
import PlanBadge from "../components/PlanBadge.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { deleteAccount } from "../lib/razorpay.js"
import { isUsernameTaken, updateProfile } from "../lib/profiles.js"
import { uploadAvatar } from "../lib/avatar.js"
import { exportUserData } from "../lib/dataExport.js"
import { getTheme, setTheme, THEMES } from "../lib/theme.js"

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"

export default function SettingsPage() {
  return (
    <PageShell>
      <RequireAuth>
        <SettingsInner />
      </RequireAuth>
    </PageShell>
  )
}

function SettingsInner() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [theme, setThemeState] = useState(getTheme)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteTyped, setDeleteTyped] = useState("")
  const [deleting, setDeleting] = useState(false)
  const avatarInputRef = useRef(null)

  // hydrate editable fields whenever the profile loads/refreshes
  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? "")
    setUsername(profile.username ?? "")
  }, [profile])

  const onAvatarFile = async (file) => {
    if (!file) return
    setAvatarBusy(true)
    try {
      const url = await uploadAvatar(user.id, file)
      await updateProfile(user.id, { profile_photo: url })
      await refreshProfile()
      showToast("avatar updated")
    } catch (e) {
      showToast(e.message)
    } finally {
      setAvatarBusy(false)
    }
  }

  const saveDisplayName = async () => {
    const name = displayName.trim()
    if (!name) {
      showToast("name can't be empty")
      return
    }
    setSavingName(true)
    try {
      await updateProfile(user.id, { display_name: name })
      await refreshProfile()
      showToast("display name saved")
    } catch (e) {
      showToast(e.message)
    } finally {
      setSavingName(false)
    }
  }

  const saveUsername = async () => {
    const u = username.trim().toLowerCase()
    if (!/^[a-z0-9_]+$/.test(u)) {
      showToast("letters, numbers and _ only")
      return
    }
    if (u === profile?.username) {
      showToast("username unchanged")
      return
    }
    setSavingUser(true)
    try {
      const taken = await isUsernameTaken(u, user.id)
      if (taken) {
        showToast("that username is taken")
        return
      }
      await updateProfile(user.id, { username: u })
      await refreshProfile()
      showToast("username saved")
    } catch (e) {
      showToast(e.message)
    } finally {
      setSavingUser(false)
    }
  }

  const pickTheme = (t) => {
    setThemeState(t)
    setTheme(t)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportUserData(user.id)
      showToast("downloading your data")
    } catch (e) {
      showToast(e.message)
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      await signOut().catch(() => {}) // session is already invalid after deletion
      navigate("/")
    } catch (e) {
      setDeleting(false)
      showToast(e.message)
    }
  }

  const status = String(profile?.subscription_status ?? "NONE").toUpperCase()

  return (
    <div className="px-page">
      <SectionHead kicker="05 · prefs" title="settings" sub="profile, appearance and account controls." />

      <div className="settings-stack">
        {/* ---------- profile ---------- */}
        <div className="px-panel px-panel--pad">
          <h3 className="px-panel-title">profile</h3>

          <div className="setting-row setting-row--avatar">
            {profile?.profile_photo ? (
              <img className="avatar-img" src={profile.profile_photo} alt="avatar" />
            ) : (
              <span className="avatar-fallback">{(displayName || "u").slice(0, 1).toUpperCase()}</span>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={(e) => onAvatarFile(e.target.files?.[0])}
            />
            <button
              type="button"
              className="px-btn px-btn--sm px-btn--white"
              disabled={avatarBusy}
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarBusy ? "uploading…" : "change photo"}
            </button>
          </div>

          <div className="setting-row">
            <div className="setting-field">
              <span className="px-label">display name</span>
              <input
                className="text-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
              />
            </div>
            <button
              type="button"
              className="px-btn px-btn--mint"
              disabled={savingName}
              onClick={saveDisplayName}
            >
              {savingName ? "saving…" : "save"}
            </button>
          </div>

          <div className="setting-row">
            <div className="setting-field">
              <span className="px-label">username</span>
              <input
                className="text-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
              />
              <p className="muted" style={{ fontSize: 14, margin: "4px 0 0" }}>
                lowercase letters, numbers and _ — must be unique.
              </p>
            </div>
            <button
              type="button"
              className="px-btn px-btn--mint"
              disabled={savingUser}
              onClick={saveUsername}
            >
              {savingUser ? "saving…" : "save"}
            </button>
          </div>

          <div className="setting-row setting-row--static">
            <div className="setting-field">
              <span className="px-label">email</span>
              <span>{user?.email ?? profile?.email ?? "—"}</span>
            </div>
            <div className="setting-field">
              <span className="px-label">member since</span>
              <span>{fmtDate(profile?.created_at ?? user?.created_at)}</span>
            </div>
          </div>
        </div>

        {/* ---------- appearance ---------- */}
        <div className="px-panel px-panel--pad">
          <h3 className="px-panel-title">appearance</h3>
          <div className="setting-row">
            <div className="setting-field">
              <span className="px-label">theme</span>
              <span className="muted">pixel light or pixel dark.</span>
            </div>
            <div className="seg-toggle">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`px-btn px-btn--sm ${theme === t ? "px-btn--active" : "px-btn--white"}`}
                  onClick={() => pickTheme(t)}
                >
                  {t === "dark" ? "🌙 dark" : "☀️ light"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- connected account ---------- */}
        <div className="px-panel px-panel--pad">
          <h3 className="px-panel-title">connected account</h3>
          <div className="setting-row setting-row--static">
            <div className="setting-field">
              <span className="px-label">provider</span>
              <span className="sub-chip sub-chip--good">{profile?.provider ?? "google"}</span>
            </div>
            <div className="setting-field">
              <span className="px-label">account</span>
              <span>{user?.email ?? profile?.email ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* ---------- subscription & billing ---------- */}
        <div className="px-panel px-panel--pad">
          <h3 className="px-panel-title">
            <span>subscription & billing</span>
            <Link to="/subscribe" className="px-link">
              manage →
            </Link>
          </h3>
          <div className="setting-row setting-row--static">
            <div className="setting-field">
              <span className="px-label">plan</span>
              <span>
                <PlanBadge plan={profile?.current_plan} /> {profile?.current_plan ?? "FREE"}
              </span>
            </div>
            <div className="setting-field">
              <span className="px-label">status</span>
              <span className="sub-chip sub-chip--good">{status === "ACTIVE" ? "active" : status.toLowerCase()}</span>
            </div>
            <div className="setting-field">
              <span className="px-label">next billing</span>
              <span>{fmtDate(profile?.next_billing_date)}</span>
            </div>
          </div>
        </div>

        {/* ---------- privacy ---------- */}
        <div className="px-panel px-panel--pad">
          <h3 className="px-panel-title">privacy</h3>
          <ul className="privacy-list">
            <li>your designs are private to you and synced to your cloud account.</li>
            <li>image imports are processed in your browser — nothing is uploaded or stored.</li>
            <li>payment details go straight to razorpay; we only keep order, invoice and plan records.</li>
            <li>export or delete your data any time below.</li>
          </ul>
        </div>

        {/* ---------- data & account ---------- */}
        <div className="px-panel px-panel--pad danger-zone">
          <h3 className="px-panel-title">data & account</h3>
          <div className="setting-row">
            <div className="setting-field">
              <span className="px-label">export user data</span>
              <span className="muted">download your profile, designs, payments and invoices as JSON.</span>
            </div>
            <button
              type="button"
              className="px-btn px-btn--white"
              disabled={exporting}
              onClick={handleExport}
            >
              {exporting ? "exporting…" : "⬇ export"}
            </button>
          </div>

          <div className="setting-row setting-row--danger">
            <div className="setting-field">
              <span className="px-label">delete account</span>
              <span className="muted">permanently removes your account, designs and billing history. this can't be undone.</span>
            </div>
            {!confirmDelete ? (
              <button
                type="button"
                className="px-btn px-btn--white"
                style={{ borderColor: "#b91c1c", color: "#b91c1c" }}
                onClick={() => setConfirmDelete(true)}
              >
                delete account
              </button>
            ) : (
              <div className="delete-confirm">
                <p className="muted" style={{ margin: "0 0 8px", fontSize: 14 }}>
                  type <strong>DELETE</strong> to confirm
                </p>
                <input
                  className="text-input"
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  placeholder="DELETE"
                />
                <div className="tool-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="px-btn px-btn--sm"
                    style={{ background: "#b91c1c", color: "#fff" }}
                    disabled={deleting || deleteTyped !== "DELETE"}
                    onClick={handleDelete}
                  >
                    {deleting ? "deleting…" : "permanently delete"}
                  </button>
                  <button
                    type="button"
                    className="px-btn px-btn--sm px-btn--white"
                    disabled={deleting}
                    onClick={() => {
                      setConfirmDelete(false)
                      setDeleteTyped("")
                    }}
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
