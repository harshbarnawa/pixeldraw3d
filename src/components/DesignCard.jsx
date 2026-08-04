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

// Design tile with load / rename / dup / versions / export / delete.
// onOpenVersions is optional — pass it to show the cloud version-history button.
export default function DesignCard({ design, onLoad, onRename, onDuplicate, onDelete, onOpenVersions, onTogglePublic }) {
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
          {onOpenVersions && (
            <button
              className="px-btn px-btn--sm px-btn--white"
              title="version history"
              onClick={() => onOpenVersions(design)}
            >
              ⟲
            </button>
          )}
          <button className="px-btn px-btn--sm px-btn--white" onClick={() => downloadDesign(design)}>
            ⤓
          </button>
          {onTogglePublic && design.isPublic !== undefined && (
            <button
              className={`px-btn px-btn--sm ${design.isPublic ? "px-btn--mint" : "px-btn--white"}`}
              title={design.isPublic ? "shared with the community" : "only you can see this"}
              onClick={() => onTogglePublic(design)}
            >
              {design.isPublic ? "public ✓" : "private"}
            </button>
          )}
          <button className="px-btn px-btn--sm px-btn--peach" onClick={() => onDelete(design.id)}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
