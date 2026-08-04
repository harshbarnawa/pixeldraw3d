import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import RequireAuth from "../components/RequireAuth.jsx"

export default function MyDesignsPage() {
  return (
    <PageShell>
      <RequireAuth>
        <div className="px-page">
          <SectionHead kicker="02 · gallery" title="my designs" sub="your cloud-backed design library." />
          <div className="px-panel px-panel--pad placeholder-panel">
            <span className="placeholder-emoji">🎨</span>
            <p className="placeholder-title">cloud sync is next up</p>
            <p className="px-section-sub">
              the next phase brings auto-save, version history and unlimited cloud designs. your designs are safe in
              this browser for now.
            </p>
          </div>
        </div>
      </RequireAuth>
    </PageShell>
  )
}
