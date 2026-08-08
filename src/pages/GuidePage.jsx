import { Link, useParams } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { GUIDES } from "../data/guides.js"

export default function GuidePage() {
  const { slug } = useParams()
  const guide = GUIDES.find((g) => g.slug === slug)

  usePageMeta(guide ? guide.title : "Guide not found", guide ? guide.excerpt : "That guide isn't available on pixeldraw3d.")

  if (!guide) {
    return (
      <PageShell>
        <div className="px-page">
          <SectionHead kicker="guides" title="guide not found" sub="that guide doesn't exist." />
          <div className="px-panel px-panel--pad">
            <p className="muted">
              try the <Link to="/guides">guides home</Link> to see everything.
            </p>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead kicker={`guide · ${guide.emoji}`} title={guide.title} sub={guide.excerpt} />

        {guide.sections.map((s) => (
          <div key={s.heading} className="px-panel px-panel--pad legal">
            <h3 className="px-panel-title">{s.heading}</h3>
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ))}

        <div className="px-panel px-panel--pad">
          <p className="muted">
            ready to try it? <Link to="/">open the editor</Link> · browse <Link to="/guides">more guides</Link>
          </p>
        </div>
      </div>
    </PageShell>
  )
}
