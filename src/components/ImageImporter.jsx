import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { PALETTE, RUBIKS_PALETTE } from "../constants.js"
import { convertToGrid, fileToImage, renderGridToCanvas } from "../lib/imageToPixel.js"
import { useAuth } from "../context/AuthContext.jsx"
import { FEATURE, hasFeature } from "../lib/plans.js"
import { imageImportUsage, recordImageImport } from "../lib/usage.js"

const PREVIEW_PX = 320

// Props: onApply({ grid, size }), palette (shared with the editor)
function ImageImporter({ onApply, palette = PALETTE }) {
  const [img, setImg] = useState(null)
  const [fileName, setFileName] = useState("")
  const [gridSize, setGridSize] = useState(32)
  const [snap, setSnap] = useState(true)
  const [cubeMode, setCubeMode] = useState(false)
  const snapPalette = cubeMode ? RUBIKS_PALETTE : palette
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  // ----- member-only feature: guests are blocked, signed-in users get a daily quota -----
  const { profile, isAuthed, refreshProfile, signInWithGoogle } = useAuth()
  const canImport = hasFeature(profile, FEATURE.IMAGE_IMPORT) // false for guests
  const usage = useMemo(() => imageImportUsage(profile), [profile])

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("drop an image file, please")
      return
    }
    if (!canImport) {
      setError("image import is for signed-in users")
      return
    }
    if (usage.remaining <= 0) {
      setError("you've used today's import limit")
      return
    }
    try {
      const image = await fileToImage(file)
      setImg(image)
      setFileName(file.name)
      setError(null)
      if (isAuthed) {
        await recordImageImport(profile)
        refreshProfile()
      }
    } catch {
      setError("couldn't read that image")
    }
  }

  // clipboard paste support
  useEffect(() => {
    const onPaste = (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"))
      if (!item) return
      const file = item.getAsFile()
      if (file) handleFile(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // recompute the grid whenever inputs change
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (!img) {
      setResult(null)
      return
    }
    setResult(convertToGrid({ img, size: gridSize, snap, palette: snapPalette, dither: "none" }))
  }, [img, gridSize, snap, snapPalette])

  // Cube mode uses the full-gamut palette; turning it on implies snapping
  const toggleCube = () => {
    setCubeMode((prev) => {
      const next = !prev
      if (next) setSnap(true)
      return next
    })
  }

  // draw live preview
  useEffect(() => {
    if (canvasRef.current && result) renderGridToCanvas(canvasRef.current, result.grid)
  }, [result])

  return (
    <div className="importer-layout">
      {/* input + options */}
      <div className="px-panel px-panel--pad stack">
        <h3 className="px-panel-title">
          <span>Convert</span>
          {isAuthed ? (
            <span className="muted" style={{ fontWeight: 400 }}>
              {usage.unlimited ? "unlimited imports" : `${usage.used} of ${usage.limit} used today`}
            </span>
          ) : (
            <span className="muted" style={{ fontWeight: 400 }}>upload · drop · paste</span>
          )}
        </h3>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        {!isAuthed ? (
          <div className="importer-gate">
            <p className="px-label" style={{ fontSize: 14 }}>image import is for members</p>
            <p className="muted" style={{ margin: "6px 0 12px" }}>log in for free daily conversions — upgrade for more.</p>
            <button type="button" className="px-btn google-btn" onClick={() => signInWithGoogle().catch(() => {})}>
              ⌁ continue with google
            </button>
          </div>
        ) : usage.remaining <= 0 ? (
          <div className="importer-gate">
            <p className="px-label" style={{ fontSize: 14 }}>daily import limit reached</p>
            <p className="muted" style={{ margin: "6px 0 12px" }}>come back tomorrow, or upgrade for more imports a day.</p>
            <Link to="/subscribe" className="px-btn px-btn--mint">✦ upgrade</Link>
          </div>
        ) : !img ? (
          <button
            type="button"
            className={`dropzone ${dragOver ? "dropzone--over" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFile(e.dataTransfer.files?.[0])
            }}
          >
            <span className="dropzone-title">🖼 drop an image here</span>
            <span className="dropzone-sub">or click to browse · or copy an image & paste (ctrl/cmd+v)</span>
          </button>
        ) : (
          <div className="tool-row">
            <span className="px-btn px-btn--sm px-btn--mint" title={fileName}>
              📷 {fileName.length > 22 ? fileName.slice(0, 20) + "…" : fileName}
            </span>
            <button className="px-btn px-btn--sm px-btn--white" onClick={() => setImg(null)}>
              remove
            </button>
            <button
              className="px-btn px-btn--sm px-btn--white"
              onClick={() => fileInputRef.current?.click()}
            >
              replace
            </button>
          </div>
        )}

        {error && <p className="muted" style={{ color: "#e11d48" }}>{error}</p>}

        <div className="opt-grid">
          <div>
            <div className="range-caption">
              <span className="px-label">Pixel grid</span>
              <span className="px-label">{gridSize}×{gridSize}</span>
            </div>
            <input
              type="range"
              min={4}
              max={100}
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="px-range"
            />
          </div>

          <div className="opt-row">
            <span className="px-label">
              <span style={{ marginRight: 6 }}>🎲</span>Cube mode — Rubik's cube colors
            </span>
            <button
              onClick={toggleCube}
              title="Snap colors to the 6 standard 3×3 Rubik's cube colors"
              className={`px-btn px-btn--sm ${cubeMode ? "px-btn--active" : "px-btn--white"}`}
            >
              {cubeMode ? "on" : "off"}
            </button>
          </div>

          <div className="opt-row">
            <span className="px-label">Snap to palette</span>
            <button
              onClick={() => setSnap((v) => !v)}
              disabled={cubeMode}
              className={`px-btn px-btn--sm ${snap ? "px-btn--active" : "px-btn--white"}`}
            >
              {snap ? "on" : "off"}
            </button>
          </div>
        </div>

        <button
          className="px-btn px-btn--mint"
          disabled={!result}
          onClick={() => onApply({ grid: result.grid, size: gridSize })}
        >
          ✦ send to slate
        </button>
      </div>

      {/* preview */}
      <div className="px-panel px-panel--pad stack">
        <h3 className="px-panel-title">
          <span>Preview</span>
          {result && (
            <span className="muted" style={{ fontWeight: 400 }}>
              {result.filled} px
            </span>
          )}
        </h3>
        <canvas
          ref={canvasRef}
          width={PREVIEW_PX}
          height={PREVIEW_PX}
          className="preview-canvas pixelated"
        />
        {!result && <p className="muted" style={{ textAlign: "center" }}>add an image to see the pixel grid ✨</p>}
      </div>
    </div>
  )
}

export default ImageImporter
