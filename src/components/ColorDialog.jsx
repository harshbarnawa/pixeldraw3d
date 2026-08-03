import { useEffect, useRef, useState } from "react"
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "../lib/palette.js"

const clamp01 = (n) => Math.max(0, Math.min(1, n))

const HUE_BAR = "linear-gradient(to bottom,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%)"

// Paint-style color dialog: saturation/value field + rainbow hue bar + black→white value bar
function ColorDialog({ open, onClose, onAdd }) {
  const [h, setH] = useState(180)
  const [s, setS] = useState(75)
  const [v, setV] = useState(90)
  const [hexInput, setHexInput] = useState("#a78bfa")

  const fieldRef = useRef(null)
  const hueRef = useRef(null)
  const valRef = useRef(null)
  const draggingRef = useRef("")

  const rgb = hsvToRgb(h, s, v)
  const hex = rgbToHex(rgb)
  const hueRgb = hsvToRgb(h, 100, 100)
  const hueColor = rgbToHex(hueRgb)

  useEffect(() => {
    setHexInput(hex)
  }, [h, s, v, hex])

  if (!open) return null

  const fromField = (e) => {
    const rect = fieldRef.current.getBoundingClientRect()
    const x = clamp01((e.clientX - rect.left) / rect.width)
    const y = clamp01((e.clientY - rect.top) / rect.height)
    setS(x * 100)
    setV((1 - y) * 100)
  }

  const fromHue = (e) => {
    const rect = hueRef.current.getBoundingClientRect()
    setH(clamp01((e.clientY - rect.top) / rect.height) * 360)
  }

  const fromVal = (e) => {
    const rect = valRef.current.getBoundingClientRect()
    setV((1 - clamp01((e.clientY - rect.top) / rect.height)) * 100)
  }

  const dragProps = (kind, ref, fn) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      ref.current.setPointerCapture(e.pointerId)
      draggingRef.current = kind
      fn(e)
    },
    onPointerMove: (e) => {
      if (draggingRef.current === kind) fn(e)
    },
    onPointerUp: () => (draggingRef.current = ""),
    onPointerCancel: () => (draggingRef.current = ""),
  })

  const applyHex = (val) => {
    setHexInput(val)
    const m = /^#?([0-9a-fA-F]{6})$/.exec(val.trim())
    if (!m) return
    const { r, g, b } = hexToRgb("#" + m[1])
    const hsv = rgbToHsv(r, g, b)
    setH(hsv.h)
    setS(hsv.s)
    setV(hsv.v)
  }

  return (
    <div className="color-backdrop" onClick={onClose}>
      <div className="color-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cd-head">
          <span className="px-label" style={{ fontSize: 14 }}>🎨 color</span>
          <span className="px-label">{hex}</span>
        </div>

        <div className="cd-body">
          {/* saturation + value box */}
          <div
            ref={fieldRef}
            className="cd-field"
            style={{
              background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, ${hueColor})`,
            }}
            {...dragProps("field", fieldRef, fromField)}
          >
            <span className="cd-marker" style={{ left: `${s}%`, top: `${100 - v}%` }} />
          </div>

          {/* rainbow hue bar + black→white value bar */}
          <div className="cd-bars">
            <div
              ref={hueRef}
              className="cd-bar cd-hue"
              style={{ background: HUE_BAR }}
              {...dragProps("hue", hueRef, fromHue)}
            >
              <span className="cd-bar-marker" style={{ top: `${(h / 360) * 100}%` }} />
            </div>
            <div
              ref={valRef}
              className="cd-bar cd-val"
              style={{ background: "linear-gradient(to bottom,#ffffff,#000000)" }}
              {...dragProps("val", valRef, fromVal)}
            >
              <span className="cd-bar-marker" style={{ top: `${100 - v}%` }} />
            </div>
          </div>
        </div>

        <div className="cd-foot">
          <span className="cd-swatch" style={{ backgroundColor: hex }} />
          <input
            className="text-input cd-hex"
            value={hexInput}
            onChange={(e) => applyHex(e.target.value)}
            spellCheck={false}
            aria-label="Hex color"
          />
          <button className="px-btn px-btn--sm px-btn--mint" onClick={() => onAdd(hex)}>
            + add
          </button>
          <button className="px-btn px-btn--sm px-btn--white" onClick={onClose}>
            close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColorDialog
