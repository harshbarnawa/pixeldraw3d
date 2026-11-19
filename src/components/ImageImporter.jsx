import { useEffect, useMemo, useRef, useState } from "react"
import { PALETTE, RUBIKS_PALETTE } from "../constants.js"
import { convertToGrid, fileToImage, getGridColorKey, renderGridToCanvas, renderTraceToCanvas } from "../lib/imageToPixel.js"
import "./ImageImporter.css"
import UpgradeDialog from "./UpgradeDialog.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { FEATURE, hasFeature } from "../lib/plans.js"
import { imageImportUsage, recordImageImport } from "../lib/usage.js"

const AXIS = 32

function downloadCanvas(canvas, name) {
  if (!canvas) return
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, "image/png")
}

// Props: onApply({ grid, size }), palette (shared with the editor)
function ImageImporter({ onApply, palette = PALETTE }) {
  const [img, setImg] = useState(null)
  const [fileName, setFileName] = useState("")
  const [gridSize, setGridSize] = useState(100)
  const [snap, setSnap] = useState(true)
  const [cubeMode, setCubeMode] = useState(false)
  const [mode, setMode] = useState("pixel")
  const [fit, setFit] = useState("contain")
  const [paletteMode, setPaletteMode] = useState("auto")
  const [paletteSize, setPaletteSize] = useState(16)
  const [dither, setDither] = useState("none")
  const [zoom, setZoom] = useState(1)
  const [showLines, setShowLines] = useState(true)
  const [showCodes, setShowCodes] = useState(false)
  const [hovered, setHovered] = useState(null)
  const snapPalette = cubeMode ? RUBIKS_PALETTE : palette
  const effectivePaletteMode = cubeMode ? "editor" : paletteMode
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const scrollRef = useRef(null)

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
      setHovered(null)
      setZoom(1)
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
  }, [canImport, usage.remaining, isAuthed, profile, refreshProfile])

  // recompute the grid whenever inputs change
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (!img) {
      setResult(null)
      return
    }
    try {
      setResult(convertToGrid({
        img,
        size: gridSize,
        mode,
        fit,
        snap,
        palette: snapPalette,
        paletteMode: effectivePaletteMode,
        colors: paletteSize,
        dither: mode === "photo" ? dither : "none",
      }))
      setError(null)
    } catch {
      setResult(null)
      setError("Couldn't process that image")
    }
  }, [img, gridSize, mode, fit, snap, snapPalette, effectivePaletteMode, paletteSize, dither])

  // Cube mode uses the full-gamut palette; turning it on implies snapping
  const toggleCube = () => {
    setCubeMode((prev) => {
      const next = !prev
      if (next) setSnap(true)
      return next
    })
  }

  const colorKey = useMemo(
    () => result ? getGridColorKey(result.grid) : { total: 0, items: [] },
    [result],
  )
  const baseCell = gridSize > 70 ? 4 : gridSize > 40 ? 6 : 10
  const cellSize = baseCell * zoom
  const canvasSide = AXIS + gridSize * cellSize

  useEffect(() => {
    if (canvasRef.current && result) {
      renderTraceToCanvas(canvasRef.current, result.grid, {
        cellSize,
        showGrid: showLines,
        showCodes,
        colorKey: colorKey.items,
        axis: AXIS,
      })
    }
  }, [result, cellSize, showLines, showCodes, colorKey])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
      scrollRef.current.scrollLeft = 0
    }
  }, [img, gridSize])

  const handlePointerMove = (event) => {
    if (!canvasRef.current || !result) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) * canvasRef.current.width / rect.width - AXIS
    const y = (event.clientY - rect.top) * canvasRef.current.height / rect.height - AXIS
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) {
      setHovered(null)
    } else {
      setHovered({ row: row + 1, col: col + 1, hex: result.grid[row][col] })
    }
  }

  const downloadPixelImage = () => {
    if (!result) return
    const canvas = document.createElement("canvas")
    canvas.width = gridSize
    canvas.height = gridSize
    renderGridToCanvas(canvas, result.grid)
    downloadCanvas(canvas, "pixeldraw3d-" + gridSize + "x" + gridSize + ".png")
  }

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
            <button type="button" className="px-btn px-btn--mint" onClick={() => setShowUpgrade(true)}>
              ✦ upgrade
            </button>
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
          <div className="trace-field">
            <label className="px-label" htmlFor="tracer-mode">Image type</label>
            <select id="tracer-mode" className="trace-select" value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="pixel">Pixel art — preserve sharp edges</option>
              <option value="photo">Photo — smooth sampling</option>
            </select>
          </div>
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
            <div className="trace-sizes">
              {[10, 20, 30, 40, 50, 100].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={["trace-pill", gridSize === value ? "trace-pill--active" : ""].join(" ")}
                  onClick={() => setGridSize(value)}
                >
                  {value}×{value}
                </button>
              ))}
            </div>
          </div>

          <div className="trace-field">
            <label className="px-label" htmlFor="tracer-fit">Image fit</label>
            <select id="tracer-fit" className="trace-select" value={fit} onChange={(event) => setFit(event.target.value)}>
              <option value="contain">Contain — keep entire image</option>
              <option value="cover">Cover — fill grid and crop</option>
            </select>
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
          {snap && !cubeMode && (
            <div className="trace-field">
              <label className="px-label" htmlFor="tracer-palette">Color palette</label>
              <select id="tracer-palette" className="trace-select" value={paletteMode} onChange={(event) => setPaletteMode(event.target.value)}>
                <option value="auto">Extract colors from image</option>
                <option value="editor">Use editor palette</option>
              </select>
            </div>
          )}
          {snap && !cubeMode && paletteMode === "auto" && (
            <div className="trace-field">
              <label className="px-label" htmlFor="tracer-colors">Maximum colors</label>
              <select id="tracer-colors" className="trace-select" value={paletteSize} onChange={(event) => setPaletteSize(Number(event.target.value))}>
                {[8, 16, 32, 64].map((value) => <option key={value} value={value}>{value} colors</option>)}
              </select>
            </div>
          )}
          {mode === "photo" && snap && (
            <div className="trace-field">
              <label className="px-label" htmlFor="tracer-dither">Dithering</label>
              <select id="tracer-dither" className="trace-select" value={dither} onChange={(event) => setDither(event.target.value)}>
                <option value="none">None</option>
                <option value="bayer">Ordered</option>
                <option value="floyd">Floyd–Steinberg</option>
              </select>
            </div>
          )}
        </div>

        <button
          className="px-btn px-btn--mint"
          disabled={!result}
          onClick={() => onApply({ grid: result.grid, size: gridSize })}
        >
          ✦ send to slate
        </button>
      </div>

      <div className="px-panel px-panel--pad stack trace-preview-panel">
        <h3 className="px-panel-title">
          <span>Pixel tracer</span>
          <span className="muted" style={{ fontWeight: 400 }}>
            {result ? result.filled.toLocaleString() + " pixels" : "preview"}
          </span>
        </h3>
        {result ? (
          <>
            <div className="trace-preview-toolbar">
              <span className="px-label">Zoom</span>
              <button type="button" className="trace-pill" disabled={zoom === 1} onClick={() => setZoom((value) => Math.max(1, value - 1))} aria-label="Zoom out">−</button>
              <span className="trace-zoom-value">{zoom}×</span>
              <button type="button" className="trace-pill" disabled={zoom === 5} onClick={() => setZoom((value) => Math.min(5, value + 1))} aria-label="Zoom in">+</button>
              <button type="button" className="trace-pill" onClick={() => setZoom(1)}>reset</button>
            </div>
            <div className="trace-scroll" ref={scrollRef} role="region" aria-label="Numbered pixel tracing grid" tabIndex={0}>
              <canvas
                ref={canvasRef}
                width={canvasSide}
                height={canvasSide}
                style={{ width: canvasSide, height: canvasSide }}
                onPointerMove={handlePointerMove}
                onPointerLeave={() => setHovered(null)}
                aria-label={gridSize + " by " + gridSize + " pixel grid"}
              />
            </div>
            <div className="trace-coordinate">
              {hovered ? (
                <>
                  <span>Row {hovered.row}, Col {hovered.col}</span>
                  <span className="trace-coordinate-color">
                    {hovered.hex && <i style={{ background: hovered.hex }} />}
                    {hovered.hex || "empty"}
                  </span>
                </>
              ) : <span>Hover a square to inspect its coordinates and color</span>}
            </div>
            <div className="trace-preview-options">
              <label><input type="checkbox" checked={showLines} onChange={(event) => setShowLines(event.target.checked)} /> Grid lines</label>
              <label><input type="checkbox" checked={showCodes} onChange={(event) => setShowCodes(event.target.checked)} /> Color codes</label>
            </div>
            {showCodes && cellSize < 17 && <p className="trace-hint">Zoom in to display color codes inside the squares.</p>}
            <div className="trace-export">
              <button type="button" className="px-btn px-btn--sm px-btn--white" onClick={downloadPixelImage}>export pixel PNG</button>
              <button type="button" className="px-btn px-btn--sm px-btn--white" onClick={() => downloadCanvas(canvasRef.current, "pixeldraw3d-trace-" + gridSize + "x" + gridSize + ".png")}>export trace grid</button>
            </div>
            <div className="trace-key-title">
              <span className="px-label">Color key</span>
              <span className="muted">{colorKey.total} used colors</span>
            </div>
            <div className="trace-color-key">
              {colorKey.items.map((item) => (
                <div className="trace-key-item" key={item.hex} title={item.count + " squares"}>
                  <span className="trace-key-number">{item.code}</span>
                  <span className="trace-key-swatch" style={{ background: item.hex }} />
                  <code>{item.hex}</code>
                </div>
              ))}
            </div>
            {colorKey.total > colorKey.items.length && (
              <p className="trace-hint">Showing the 64 most-used colors. Use palette snapping for a shorter key.</p>
            )}
          </>
        ) : (
          <div className="trace-empty">Add an image to generate its pixel tracing grid</div>
        )}
      </div>

      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}

export default ImageImporter
