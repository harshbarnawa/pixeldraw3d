import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { renderGridToCanvas } from "../lib/imageToPixel.js"

const THUMB_PX = 144

// One card in the community grid: 2D thumbnail, name, creator, and the
// like / comment / share row. Like is optimistic (handled by the parent).
export default function CommunityCard({ design, liked = false, onToggleLike, onShare }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current) renderGridToCanvas(canvasRef.current, design.grid)
  }, [design.grid])

  const creator = design.creator
  const avatar = creator?.profilePhoto ? (
    <img src={creator.profilePhoto} alt="" className="comm-avatar" />
  ) : (
    <span className="comm-avatar comm-avatar--none">{(creator?.displayName || creator?.username || "u").slice(0, 1).toUpperCase()}</span>
  )

  return (
    <article className="comm-card">
      <Link to={`/d/${design.id}`} className="comm-thumb">
        <canvas ref={canvasRef} width={THUMB_PX} height={THUMB_PX} className="pixelated" />
        <span className="comm-name">{design.name}</span>
      </Link>
      <div className="comm-meta">
        <Link to={`/u/${creator?.username}`} className="comm-creator">
          {avatar}
          <span className="comm-creator-name">{creator?.displayName || creator?.username || "unknown"}</span>
        </Link>
        <div className="comm-stats">
          {onToggleLike && (
            <button
              type="button"
              className={`comm-stat${liked ? " comm-stat--on" : ""}`}
              onClick={() => onToggleLike(design)}
              title={liked ? "unlike" : "like"}
            >
              ♥ {design.likeCount}
            </button>
          )}
          <span className="comm-stat" title="comments">
            💬 {design.commentCount}
          </span>
          {onShare && (
            <button type="button" className="comm-stat" onClick={() => onShare(design)} title="share">
              ↗
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
