import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { TEMPLATES } from "../data/templates.js"

// Miniature pixel preview built straight from the template rows.
function TemplatePreview({ rows, color }) {
  return (
    <div className="template-preview" aria-hidden="true">
      {rows.map((row, r) => (
        <div key={r} className="template-preview-row">
          {row.split("").map((ch, c) => (
            <span
              key={c}
              className="template-preview-cell"
              style={ch.toLowerCase() === "x" ? { background: color } : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function TemplatesPage() {
  usePageMeta(
    "Templates",
    "Free pixel-art templates for pixeldraw3d — hearts, mushrooms, cats, rockets and more. Pick one and start drawing on the slate.",
  )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead
          kicker="templates"
          title="pixel templates"
          sub="a gallery of pixel-art starters — pick one and it loads straight onto the slate."
        />

        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <Link key={t.name} to={`/?template=${t.name}`} className="template-card px-panel px-panel--pad">
              <TemplatePreview rows={t.rows} color={t.color} />
              <span className="template-card-name">
                {t.emoji} {t.name}
              </span>
              <span className="template-card-cta">start drawing →</span>
            </Link>
          ))}
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 20 }}>
          templates load as a fresh copy in the editor — everything is editable, and none of your saved designs are
          touched.
        </p>
      </div>
    </PageShell>
  )
}
