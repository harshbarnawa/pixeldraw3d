import { useEffect, useRef, useState } from "react"
import { renderGridToCanvas } from "../lib/imageToPixel.js"

const THUMB_PX = 96

function timeAgo(ts) {
  if (!ts) return ""
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

function downloadDesign(design) {
  const slug = (design.name || "design").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  const blob = new Blob([JSON.stringify({ app: "pixeldraw3d", version: 1, design }, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${slug}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function DesignCard({ design, onLoad, onRename, onDuplicate, onDelete }) {
  const canvasRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(design.name)

  useEffect(() => {
    if (canvasRef.current) renderGridToCanvas(canvasRef.current, design.grid)
  }, [design.grid])

  const commitRename = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== design.name) onRename(design.id, trimmed)
    else setName(design.name)
    setEditing(false)
  }

  return (
    <div className="design-card">
      <div className="design-thumb">
        <canvas
          ref={canvasRef}
          width={THUMB_PX}
          height={THUMB_PX}
          className="pixelated"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div className="design-meta">
        {editing ? (
          <input
            autoFocus
            className="text-input"
            style={{ marginBottom: 8 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") {
                setName(design.name)
                setEditing(false)
              }
            }}
          />
        ) : (
          <p className="design-name">{design.name}</p>
        )}
        <p className="design-date">
          {design.size}×{design.size} · {timeAgo(design.updatedAt)}
        </p>
        <div className="design-actions">
          <button className="px-btn px-btn--sm px-btn--mint" onClick={() => onLoad(design)}>
            load
          </button>
          <button className="px-btn px-btn--sm px-btn--white" onClick={() => setEditing(true)}>
            rename
          </button>
          <button className="px-btn px-btn--sm px-btn--lavender" onClick={() => onDuplicate(design.id)}>
            dup
          </button>
          <button className="px-btn px-btn--sm px-btn--white" onClick={() => downloadDesign(design)}>
            ⤓
          </button>
          <button className="px-btn px-btn--sm px-btn--peach" onClick={() => onDelete(design.id)}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// Props: designs, onLoad, onRename, onDuplicate, onDelete, onExportAll, onImportFile
function DesignLibrary({ designs, onLoad, onRename, onDuplicate, onDelete, onExportAll, onImportFile }) {
  const importRef = useRef(null)

  return (
    <div className="stack">
      <div className="tool-row">
        <span className="px-panel-title" style={{ margin: 0 }}>
          <span>Saved designs</span>
          <span className="muted" style={{ fontWeight: 400 }}>
            {designs.length} saved
          </span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="px-btn px-btn--sm px-btn--butter" onClick={onExportAll} disabled={designs.length === 0}>
            ⤓ export all
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ""
            }}
          />
          <button className="px-btn px-btn--sm px-btn--lavender" onClick={() => importRef.current?.click()}>
            ⇪ import
          </button>
        </div>
      </div>

      {designs.length === 0 ? (
        <div className="px-panel px-panel--pad" style={{ textAlign: "center", padding: "56px 20px" }}>
          <p style={{ fontSize: 34, margin: "0 0 8px" }}>🎨</p>
          <p className="px-label" style={{ fontSize: 14 }}>
            no designs yet — draw something in the editor and hit “save design”
          </p>
        </div>
      ) : (
        <div className="designs-grid">
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              onLoad={onLoad}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DesignLibrary
