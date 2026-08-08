import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { GUIDES } from "../data/guides.js"

export default function GuidesPage() {
  usePageMeta(
    "Guides",
    "Pixel-art tutorials for pixeldraw3d — learn to draw on the slate, convert photos to pixels, push your art into 3D, and share it with the community.",
  )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead
          kicker="guides"
          title="learn the tools"
          sub="step-by-step tutorials for drawing, converting, 3D, and sharing your pixel art."
        />

        <div className="guide-list">
          {GUIDES.map((g) => (
            <Link key={g.slug} to={`/guides/${g.slug}`} className="guide-card px-panel px-panel--pad">
              <div className="guide-card-emoji">{g.emoji}</div>
              <div className="guide-card-body">
                <h3 className="px-panel-title">{g.title}</h3>
                <p className="muted">{g.excerpt}</p>
              </div>
              <span className="guide-card-arrow">→</span>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
