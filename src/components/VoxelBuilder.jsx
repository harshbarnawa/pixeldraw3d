import { useEffect, useRef, useState } from "react"
import VoxelViewport from "./VoxelViewport"
import ColorDialog from "./ColorDialog"
import { PALETTE, PRESETS, SIZE_OPTIONS, MAX_HISTORY } from "../constants.js"
import { cloneGrid, countFilled, emptyGrid, presetToGrid } from "../lib/grid.js"

// Pastel cursor colors (outer stroke + inner fill) encoded for the SVG data-URI
const CURSOR_OUTER = "%234a3b5c" // ink
const CURSOR_INNER = "%23ffffff" // white

// Small line icons for the tool buttons (stroke inherits currentColor)
function ToolIcon({ name, className = "w-4 h-4" }) {
  const paths = {
    draw: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    erase: (
      <>
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </>
    ),
    fill: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
    undo: (
      <>
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
      </>
    ),
    redo: (
      <>
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

// Cursor that matches the active tool (ink pen / eraser / bucket, drawn as data-URI SVGs)
function cursorFor(tool) {
  const pencil = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='translate(6 4)'%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' fill='none' stroke='${CURSOR_OUTER}' stroke-width='4' stroke-linejoin='round'/%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' fill='none' stroke='${CURSOR_INNER}' stroke-width='1.8' stroke-linejoin='round'/%3E%3C/g%3E%3C/svg%3E") 8 26, auto`

  const eraser = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='translate(5 6)'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' fill='none' stroke='${CURSOR_OUTER}' stroke-width='4' stroke-linejoin='round'/%3E%3Cpath d='M22 21H7' fill='none' stroke='${CURSOR_OUTER}' stroke-width='4'/%3E%3Cpath d='m5 11 9 9' fill='none' stroke='${CURSOR_OUTER}' stroke-width='4'/%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' fill='none' stroke='${CURSOR_INNER}' stroke-width='2' stroke-linejoin='round'/%3E%3Cpath d='M22 21H7' fill='none' stroke='${CURSOR_INNER}' stroke-width='2'/%3E%3Cpath d='m5 11 9 9' fill='none' stroke='${CURSOR_INNER}' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E") 15 18, auto`

  const fill = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='translate(6 5)'%3E%3Cpath d='M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z' fill='none' stroke='${CURSOR_OUTER}' stroke-width='4' stroke-linejoin='round'/%3E%3Cpath d='M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z' fill='none' stroke='${CURSOR_INNER}' stroke-width='1.8' stroke-linejoin='round'/%3E%3C/g%3E%3C/svg%3E") 18 25, auto`

  if (tool === "erase") return eraser
  if (tool === "fill") return fill
  return pencil
}

// Workspace state lives in App; this component drives it.
// Props: grid, size, setGrid, setSize, extrude, setExtrude,
//        randomLift, setRandomLift, palette, onAddColor,
//        onRequestSave, onOpenDesigns
function VoxelBuilder({
  grid,
  size,
  setGrid,
  setSize,
  extrude,
  setExtrude,
  randomLift,
  setRandomLift,
  palette,
  onAddColor,
  onRequestSave,
  onOpenDesigns,
}) {
  const [tool, setTool] = useState("draw")
  const [activeColor, setActiveColor] = useState(PRESETS[0]?.color ?? PALETTE[0])
  const [autoRotate, setAutoRotate] = useState(false)
  const [showEdges, setShowEdges] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [symMode, setSymMode] = useState("off") // off | h | v | both
  const [showMirrorLine, setShowMirrorLine] = useState(true) // mirror axis guide on slate
  const [isRightHeld, setIsRightHeld] = useState(false) // right-click = quick erase
  const [isDrawing, setIsDrawing] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)

  // Mirror of the committed state, so history snapshots read the latest grid
  const stateRef = useRef({ grid, size })
  useEffect(() => {
    stateRef.current = { grid, size }
  }, [grid, size])

  const pastRef = useRef([])
  const futureRef = useRef([])
  const strokePushedRef = useRef(false)
  const apiRef = useRef(null)

  // ----- history -----
  const snap = () => ({ grid: cloneGrid(stateRef.current.grid), size: stateRef.current.size })

  const pushPast = (snapshot) => {
    pastRef.current.push(snapshot)
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift()
    futureRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }

  const undo = () => {
    if (pastRef.current.length === 0) return
    const prev = pastRef.current.pop()
    futureRef.current.push(snap())
    setSize(prev.size)
    setGrid(prev.grid)
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(true)
  }

  const redo = () => {
    if (futureRef.current.length === 0) return
    const next = futureRef.current.pop()
    pastRef.current.push(snap())
    setSize(next.size)
    setGrid(next.grid)
    setCanRedo(futureRef.current.length > 0)
    setCanUndo(true)
  }

  // ----- drawing -----
  const getSymCells = (r, c) => {
    if (symMode === "off") return [[r, c]]
    const s = size - 1
    const cells = [[r, c]]
    if (symMode === "h" || symMode === "both") cells.push([r, s - c])
    if (symMode === "v" || symMode === "both") cells.push([s - r, c])
    if (symMode === "both") cells.push([s - r, s - c])
    return cells
  }

  const paint = (r, c, forceErase = false) => {
    setGrid((prev) => {
      const cells = getSymCells(r, c)
      const value = forceErase || tool === "erase" ? null : activeColor
      const next = prev.map((row) => [...row])
      let changed = false
      for (const [cr, cc] of cells) {
        if (next[cr][cc] !== value) {
          next[cr][cc] = value
          changed = true
        }
      }
      return changed ? next : prev
    })
  }

  const bucketFill = (r, c) => {
    const n = grid.length
    const target = grid[r][c]
    if (target === activeColor) return
    const next = grid.map((row) => [...row])
    const stack = [[r, c]]
    while (stack.length) {
      const [cr, cc] = stack.pop()
      if (cr < 0 || cc < 0 || cr >= n || cc >= n) continue
      if (next[cr][cc] !== target) continue
      next[cr][cc] = activeColor
      stack.push([cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1])
    }
    pushPast(snap())
    setGrid(next)
  }

  const beginStroke = () => {
    if (strokePushedRef.current) return
    pushPast(snap())
    strokePushedRef.current = true
  }

  const endStroke = () => {
    setIsDrawing(false)
    strokePushedRef.current = false
  }

  const onCellPointerDown = (r, c, e) => {
    e.preventDefault()
    const rightClick = e.button === 2
    if (tool === "fill" && !rightClick) {
      bucketFill(r, c)
      return
    }
    beginStroke()
    paint(r, c, rightClick)
  }

  const onCellPointerEnter = (r, c, e) => {
    if (!isDrawing || tool === "fill") return
    beginStroke()
    // e.buttons === 2 means the right mouse button is held during a drag
    paint(r, c, e.buttons === 2)
  }

  // ----- actions -----
  const clear = () => {
    pushPast(snap())
    setGrid(emptyGrid(size))
  }

  const changeSize = (s) => {
    if (s === size) return
    pushPast(snap())
    setSize(s)
    setGrid(emptyGrid(s))
  }

  const loadPreset = (preset) => {
    pushPast(snap())
    setSize(preset.rows.length)
    setGrid(presetToGrid(preset))
    setActiveColor(preset.color)
    setTool("draw")
  }

  // ----- keyboard shortcuts (Ctrl/Cmd+Z / +Shift+Z / +Y) -----
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === "z" && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (k === "z") {
        e.preventDefault()
        undo()
      } else if (k === "y") {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const filled = countFilled(grid)
  const cursor = cursorFor(isRightHeld ? "erase" : tool)

  // Color dialog add → palette + set as active draw color
  const handleAddColor = (hex) => {
    onAddColor(hex)
    setActiveColor(hex)
  }

  return (
    <>
      {/* save / designs toolbar */}
      <div className="tool-row">
        <button className="px-btn" onClick={() => onRequestSave({ grid, size, extrude, randomLift })}>
          💾 save design
        </button>
        <button className="px-btn px-btn--mint" onClick={onOpenDesigns}>
          ◫ open designs
        </button>
        <span className="px-label muted" style={{ marginLeft: "auto" }}>
          ctrl/cmd+z undo · +shift+z redo
        </span>
      </div>

      <div className="editor-row">
        {/* left vertical toolbar */}
        <aside className="editor-tools">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => loadPreset(p)}
              title={p.name}
              aria-label={`Load ${p.name} preset`}
              className="px-btn px-btn--sm px-btn--white"
            >
              {p.emoji}
            </button>
          ))}

          <div className="tool-divider" />

          {["draw", "erase", "fill"].map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              title={t}
              aria-label={t}
              className={`icon-btn ${tool === t ? "icon-btn--active" : ""}`}
            >
              <ToolIcon name={t} />
            </button>
          ))}

          <div className="tool-divider" />

          <button onClick={undo} disabled={!canUndo} title="Undo" aria-label="Undo" className="icon-btn">
            <ToolIcon name="undo" />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo" aria-label="Redo" className="icon-btn">
            <ToolIcon name="redo" />
          </button>
          <button onClick={clear} title="Clear" className="px-btn px-btn--sm px-btn--peach">
            clear
          </button>

          <div className="tool-divider" />

          <button
            onClick={() => setSymMode((m) => ({ off: "h", h: "v", v: "both", both: "off" })[m])}
            title="Mirror mode — click to cycle: OFF → H → V → BOTH"
            className={`px-btn px-btn--sm ${symMode !== "off" ? "px-btn--active" : "px-btn--white"}`}
          >
            M:{symMode.toUpperCase()}
          </button>
        </aside>

        <div className="editor-grid">
          {/* 2D slate */}
          <div className="px-panel px-panel--pad">
            <div className="px-panel-title">
              <span>Slate · {size}×{size}</span>
              <span className="muted">
                {filled} block{filled === 1 ? "" : "s"}
              </span>
            </div>

            <div
              className="slate-wrap"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, cursor }}
              onPointerDown={(e) => {
                setIsDrawing(true)
                setIsRightHeld(e.button === 2)
              }}
              onPointerUp={() => {
                endStroke()
                setIsRightHeld(false)
              }}
              onPointerLeave={() => {
                endStroke()
                setIsRightHeld(false)
              }}
              onPointerEnter={(e) => setIsRightHeld(e.buttons === 2)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {Array.from({ length: size * size }, (_, i) => {
                const r = Math.floor(i / size)
                const c = i % size
                const cell = grid[r][c]
                return (
                  <div
                    key={i}
                    onPointerDown={(e) => onCellPointerDown(r, c, e)}
                    onPointerEnter={(e) => onCellPointerEnter(r, c, e)}
                    className={cell ? "cell cell-filled" : "cell cell-empty"}
                    style={cell ? { backgroundColor: cell } : undefined}
                  />
                )
              })}

              {/* mirror axis guide */}
              {showMirrorLine && (symMode === "h" || symMode === "both") && (
                <div className="mirror-line" style={{ top: 0, bottom: 0, left: "50%", width: 2, transform: "translateX(-50%)" }} />
              )}
              {showMirrorLine && (symMode === "v" || symMode === "both") && (
                <div className="mirror-line" style={{ left: 0, right: 0, top: "50%", height: 2, transform: "translateY(-50%)" }} />
              )}
            </div>

            {/* grid size */}
            <div className="tool-row mt-6" style={{ justifyContent: "center" }}>
              <span className="px-label" style={{ marginRight: 4 }}>
                Grid
              </span>
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeSize(s)}
                  className={`px-btn px-btn--sm ${size === s ? "px-btn--active" : "px-btn--white"}`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
          </div>

          {/* 3D viewport */}
          <div className="px-panel">
            <div className="px-panel--pad" style={{ paddingBottom: 0 }}>
              <div className="px-panel-title">
                <span>Viewport</span>
                <span className="muted" style={{ fontWeight: 400 }}>drag rotate · scroll zoom</span>
              </div>

              <div className="mt-6">
                <div className="range-caption">
                  <span className="px-label">Height</span>
                  <span className="px-label">{extrude}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={extrude}
                  onChange={(e) => setExtrude(Number(e.target.value))}
                  className="px-range"
                />
              </div>

              <div className="mt-4">
                <div className="range-caption">
                  <span className="px-label">Random lift</span>
                  <span className="px-label">{randomLift}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={randomLift}
                  onChange={(e) => setRandomLift(Number(e.target.value))}
                  title="Move each column up by a random amount — it only translates, the height slider still decides the cube count"
                  className="px-range"
                />
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 15 }}>
                  lifts each column up randomly — cube count stays fixed
                </p>
              </div>
            </div>

            <div className="viewport-wrap mt-4">
              <VoxelViewport
                grid={grid}
                size={size}
                extrude={extrude}
                randomLift={randomLift}
                showEdges={showEdges}
                showGrid={showGrid}
                autoRotate={autoRotate}
                apiRef={apiRef}
                fileName="pixeldraw3d.png"
              />

              {/* viewport control rail */}
              <div className="viewport-tools">
                <button
                  className="mini-btn"
                  onClick={() => apiRef.current?.top()}
                  title="Top view"
                  aria-label="Top view"
                >
                  ⬆
                </button>
                <button
                  className={`mini-btn ${showGrid ? "mini-btn--active" : ""}`}
                  onClick={() => setShowGrid((v) => !v)}
                  title="Toggle grid"
                  aria-label="Toggle grid"
                >
                  ▦
                </button>
                <button
                  className={`mini-btn ${showEdges ? "mini-btn--active" : ""}`}
                  onClick={() => setShowEdges((v) => !v)}
                  title="Toggle edges"
                  aria-label="Toggle edges"
                >
                  ⌗
                </button>
                <button
                  className={`mini-btn ${autoRotate ? "mini-btn--active" : ""}`}
                  onClick={() => setAutoRotate((v) => !v)}
                  title="Auto-rotate"
                  aria-label="Auto-rotate"
                >
                  ⟳
                </button>
                <button
                  className="mini-btn"
                  onClick={() => apiRef.current?.reset()}
                  title="Reset camera"
                  aria-label="Reset camera"
                >
                  ⌖
                </button>
              </div>

              <button
                onClick={() => apiRef.current?.capture()}
                title="Save as PNG"
                className="px-btn px-btn--sm viewport-pill"
                style={{ background: "#4a3b5c", color: "#fff" }}
              >
                ⤓ png
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* palette strip */}
      <div className="palette-strip">
        <span className="px-label">Color</span>
        {palette.map((col) => (
          <button
            key={col}
            onClick={() => setActiveColor(col)}
            title={col}
            aria-label={`Pick color ${col}`}
            className={`palette-swatch ${activeColor === col ? "palette-swatch--active" : ""}`}
            style={{ backgroundColor: col }}
          />
        ))}
        <input
          type="color"
          value={activeColor}
          onChange={(e) => setActiveColor(e.target.value)}
          title="Custom color"
          aria-label="Custom color picker"
          className="palette-custom"
          style={{ backgroundColor: activeColor }}
        />
        <button
          className="px-btn px-btn--sm px-btn--lavender"
          style={{ marginLeft: "auto" }}
          onClick={() => setColorOpen(true)}
        >
          🎨 color
        </button>
      </div>

      <ColorDialog open={colorOpen} onClose={() => setColorOpen(false)} onAdd={handleAddColor} />
    </>
  )
}

export default VoxelBuilder
