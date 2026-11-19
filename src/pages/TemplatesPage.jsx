import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { TEMPLATES, TEMPLATE_CATEGORIES } from "../data/templates.js"
import { renderGridToCanvas } from "../lib/imageToPixel.js"
import "./TemplatesPage.css"

function TemplatePreview({ template }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    renderGridToCanvas(canvasRef.current, template.grid)
  }, [template.grid])

  return (
    <div className="template-artwork">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="template-art-canvas"
        role="img"
        aria-label={template.name + " multicolor pixel art preview"}
      />
    </div>
  )
}

function TemplateCard({ template }) {
  return (
    <article className="template-card-v2 px-panel">
      <Link
        to={"/?template=" + encodeURIComponent(template.name)}
        className="template-art-link"
        aria-label={"Load " + template.name + " in the editor"}
      >
        <TemplatePreview template={template} />
      </Link>
      <div className="template-card-info">
        <div className="template-card-labels">
          <span className="template-tag">{template.category}</span>
          <span className="template-tag template-tag--subtle">{template.level}</span>
        </div>
        <h2 className="template-title">{template.name}</h2>
        <p className="template-description">{template.description}</p>
        <div className="template-facts">
          <span>{template.size} × {template.size} pixels</span>
          <span>{template.colors} colors</span>
        </div>
        <Link
          to={"/?template=" + encodeURIComponent(template.name)}
          className="template-use px-btn px-btn--mint"
        >
          Use this template <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  )
}

export default function TemplatesPage() {
  usePageMeta(
    "Pixel Art Templates",
    "Explore 21 detailed multicolor pixel art templates for PixelDraw3D. Load editable animal, fantasy, food, nature and retro scene artwork directly on your slate.",
  )

  const [category, setCategory] = useState("All")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => TEMPLATES.filter((template) => {
    const matchesCategory = category === "All" || template.category === category
    const term = query.trim().toLowerCase()
    const matchesQuery = !term ||
      template.name.toLowerCase().includes(term) ||
      template.description.toLowerCase().includes(term) ||
      template.category.toLowerCase().includes(term)
    return matchesCategory && matchesQuery
  }), [category, query])

  return (
    <PageShell>
      <div className="px-page templates-page">
        <SectionHead
          kicker="templates · pixel studio"
          title="pixel art collection"
          sub="Detailed, multicolor artworks you can open, edit, remix and save on your own slate."
        />

        <div className="template-intro px-panel px-panel--pad">
          <div className="template-intro-copy">
            <span className="template-eyebrow">The pixel gallery</span>
            <strong>Pick a piece. Make it yours.</strong>
            <p>
              From neon cityscapes to fantasy items, every template contains real pixel-by-pixel colors.
              No flat placeholder icons — the artwork you preview is exactly what loads in the editor.
            </p>
          </div>
          <div className="template-intro-stats">
            <div><strong>{TEMPLATES.length}</strong><span>designs</span></div>
            <div><strong>30×30</strong><span>pixel grids</span></div>
            <div><strong>100%</strong><span>editable</span></div>
          </div>
        </div>

        <div className="template-toolbar">
          <div className="template-filters" role="group" aria-label="Filter templates by category">
            {TEMPLATE_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={"template-filter" + (category === item ? " template-filter--active" : "")}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="template-search">
            <span className="visually-hidden">Search pixel art templates</span>
            <input
              type="search"
              className="text-input"
              placeholder="Search artwork..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="template-result-count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "design" : "designs"} available
        </div>

        {filtered.length ? (
          <div className="template-grid-v2">
            {filtered.map((template) => (
              <TemplateCard key={template.name} template={template} />
            ))}
          </div>
        ) : (
          <div className="px-panel px-panel--pad template-no-results">
            <strong>No matching pixel art.</strong>
            <p>Try another category or search term.</p>
            <button type="button" className="px-btn px-btn--white" onClick={() => { setCategory("All"); setQuery("") }}>
              Show all templates
            </button>
          </div>
        )}

        <p className="template-note">
          Templates open as fresh editable artwork. Your existing saved designs stay untouched.
        </p>
      </div>
    </PageShell>
  )
}
