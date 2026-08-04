import { useEffect, useRef, useState } from "react"
import { renderGridToCanvas } from "../lib/imageToPixel.js"

// Reddit/Twitter-style publish: clicking "public" on a design opens this dialog
// where the user adds a quote; the design + quote are posted to the community.
export default function PublishDialog({ design, busy, onClose, onPublish }) {
  const canvasRef = useRef(null)
  const [quote, setQuote] = useState("")

  // design is null until the dialog is opened — the optional chaining keeps the
  // dependency array from dereferencing null (which would crash every mount).
  useEffect(() => {
    if (design && canvasRef.current) renderGridToCanvas(canvasRef.current, design.grid)
  }, [design?.grid])

  if (!design) return null

  return (
    <div className="color-backdrop" onClick={onClose}>
      <div className="color-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cd-head">
          <span className="px-panel-title" style={{ margin: 0 }}>
            share to community
          </span>
          <button type="button" className="mini-btn" onClick={onClose} aria-label="close" disabled={busy}>
            ✕
          </button>
        </div>

        <div className="publish-preview">
          <canvas ref={canvasRef} width={96} height={96} className="pixelated" />
          <div className="publish-preview-text">
            <p className="design-name" style={{ margin: 0 }}>
              {design.name}
            </p>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
              everyone on explore will see this post
            </p>
          </div>
        </div>

        <textarea
          className="text-input publish-quote"
          rows={3}
          placeholder="add a caption or quote (optional)…"
          value={quote}
          disabled={busy}
          onChange={(e) => setQuote(e.target.value)}
          maxLength={280}
        />

        <div className="cd-foot" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="px-btn px-btn--mint"
            disabled={busy}
            onClick={() => onPublish(quote.trim())}
          >
            {busy ? "posting…" : "share to community"}
          </button>
          <button type="button" className="px-btn px-btn--white" onClick={onClose} disabled={busy}>
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}
