import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"

const THUMB_PX = 112

const timeAgo = (ts) => {
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

// A community post — a design + quote (or plain text), like a Reddit/Twitter
// card. Like is optimistic (handled by the parent).
export default function PostCard({ post, liked = false, onToggleLike, onShare, onDelete, currentUserId }) {
  const canvasRef = useRef(null)
  const design = post.designs
  const author = post.profiles

  useEffect(() => {
    if (canvasRef.current && design) renderThumb(canvasRef.current, design)
  }, [design])

  const avatar = author?.profile_photo ? (
    <img src={author.profile_photo} alt="" className="comm-avatar comm-avatar--sm" />
  ) : (
    <span className="comm-avatar comm-avatar--none comm-avatar--sm">
      {(author?.display_name || author?.username || "u").slice(0, 1).toUpperCase()}
    </span>
  )

  return (
    <article className="post-card px-panel px-panel--pad">
      <div className="post-head">
        <Link to={`/u/${author?.username}`} className="comm-creator">
          {avatar}
          <span className="comm-creator-name">{author?.display_name || author?.username || "user"}</span>
        </Link>
        <span className="muted post-time">{timeAgo(post.created_at)}</span>
        {onDelete && currentUserId === post.user_id && (
          <button type="button" className="link-danger" onClick={() => onDelete(post.id)}>
            delete
          </button>
        )}
      </div>

      {design && (
        <Link to={`/d/${design.id}`} className="post-design">
          <canvas ref={canvasRef} width={THUMB_PX} height={THUMB_PX} className="pixelated post-thumb" />
          <span className="post-design-name">{design.name}</span>
        </Link>
      )}

      {post.body && <p className="post-body">{post.body}</p>}

      <div className="post-actions">
        {onToggleLike && (
          <button
            type="button"
            className={`comm-stat${liked ? " comm-stat--on" : ""}`}
            onClick={() => onToggleLike(post)}
          >
            ♥ {post.like_count}
          </button>
        )}
        {design && (
          <Link to={`/d/${design.id}`} className="comm-stat">
            💬 {post.comment_count}
          </Link>
        )}
        {onShare && (
          <button type="button" className="comm-stat" onClick={() => onShare(post)}>
            ↗ share
          </button>
        )}
      </div>
    </article>
  )
}

// render the design grid to a small thumbnail canvas
function renderThumb(canvas, design) {
  if (!design.grid?.length) return
  const size = design.grid.length
  const ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const cell = canvas.width / size
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const color = design.grid[r][c]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(c * cell, r * cell, Math.ceil(cell), Math.ceil(cell))
    }
  }
}
