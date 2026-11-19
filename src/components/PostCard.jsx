import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { renderGridToCanvas } from "../lib/imageToPixel.js"
import "./SocialFeed.css"

const age = (date) => {
  if (!date) return ""
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000))
  if (minutes < 1) return "now"
  if (minutes < 60) return minutes + "m"
  if (minutes < 1440) return Math.floor(minutes / 60) + "h"
  if (minutes < 10080) return Math.floor(minutes / 1440) + "d"
  return new Date(date).toLocaleDateString()
}

export default function PostCard({ post, liked = false, onToggleLike, onShare, onDelete, currentUserId }) {
  const canvasRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const design = post.designs
  const author = post.profiles
  const username = author?.username
  const name = author?.display_name || username || "creator"
  const likeCount = design ? (design.like_count ?? 0) : (post.like_count ?? 0)
  const commentCount = design?.comment_count ?? post.comment_count ?? 0
  const caption = post.body?.trim() || ""
  const longCaption = caption.length > 130

  useEffect(() => {
    if (canvasRef.current && design?.grid?.length) {
      renderGridToCanvas(canvasRef.current, design.grid)
    }
  }, [design?.grid])

  const avatar = author?.profile_photo ? (
    <img className="comm-avatar" src={author.profile_photo} alt="" />
  ) : (
    <span className="comm-avatar comm-avatar--none">{name.slice(0, 1).toUpperCase()}</span>
  )

  const identity = (
    <>
      {avatar}
      <span className="social-author-text">
        <strong>{name}</strong>
        {username && <small>@{username}</small>}
      </span>
    </>
  )

  return (
    <article className="social-post px-panel">
      <header className="social-post-header">
        {username ? (
          <Link to={"/u/" + username} className="social-post-user">{identity}</Link>
        ) : (
          <div className="social-post-user">{identity}</div>
        )}
        <time className="muted" dateTime={post.created_at || undefined}>{age(post.created_at)}</time>
        {onDelete && !post.synthetic && currentUserId === post.user_id && (
          <button className="social-delete" type="button" onClick={() => onDelete(post.id)}>delete</button>
        )}
      </header>

      {design?.grid?.length > 0 && (
        <Link className="social-art" to={"/d/" + design.id} aria-label={"Open design " + design.name}>
          <canvas ref={canvasRef} className="social-art-canvas" width={512} height={512} />
        </Link>
      )}

      <div className="social-post-content">
        <div className="social-actions">
          {onToggleLike && (
            <button type="button" className={"social-action" + (liked ? " social-action--liked" : "")} onClick={() => onToggleLike(post)} aria-pressed={liked}>
              <span aria-hidden="true">{liked ? "♥" : "♡"}</span> <span>Like</span>
            </button>
          )}
          {design && (
            <Link className="social-action" to={"/d/" + design.id + "#comments"}>
              <span aria-hidden="true">▤</span> <span>Comment</span>
            </Link>
          )}
          {design && onShare && (
            <button type="button" className="social-action" onClick={() => onShare(post)}>
              <span aria-hidden="true">↗</span> <span>Share</span>
            </button>
          )}
        </div>

        <div className="social-counts">
          <strong>{likeCount} {likeCount === 1 ? "like" : "likes"}</strong>
          {design && <Link to={"/d/" + design.id + "#comments"}>{commentCount} {commentCount === 1 ? "comment" : "comments"}</Link>}
        </div>

        {design && (
          <p className="social-design-name">
            <Link to={"/d/" + design.id}>{design.name}</Link>
          </p>
        )}

        {caption && (
          <div className="social-caption">
            <strong>{name}</strong>{" "}
            <span className={longCaption && !expanded ? "social-caption-clamped" : ""}>{longCaption && !expanded ? caption.slice(0, 130).trimEnd() + "…" : caption}</span>
            {longCaption && (
              <button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "less" : "more"}</button>
            )}
          </div>
        )}

        {design && (
          <Link className="social-open-design" to={"/d/" + design.id}>
            View artwork and comments
          </Link>
        )}
      </div>
    </article>
  )
}
