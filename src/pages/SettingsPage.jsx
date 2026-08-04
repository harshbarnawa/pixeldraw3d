import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import RequireAuth from "../components/RequireAuth.jsx"

export default function SettingsPage() {
  return (
    <PageShell>
      <RequireAuth>
        <div className="px-page">
          <SectionHead kicker="05 · prefs" title="settings" sub="profile, theme and account controls." />
          <div className="px-panel px-panel--pad placeholder-panel">
            <span className="placeholder-emoji">⚙️</span>
            <p className="placeholder-title">settings are being built</p>
            <p className="px-section-sub">
              display name, avatar, theme, billing and data controls land in a later phase.
            </p>
          </div>
        </div>
      </RequireAuth>
    </PageShell>
  )
}
