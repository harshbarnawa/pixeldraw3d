import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import VoxelViewport from "../components/VoxelViewport.jsx"
import { renderGridToCanvas } from "../lib/imageToPixel.js"
import { copyDesignLink } from "../lib/share.js"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
import "../components/SocialFeed.css"
import {
  addComment,
  deleteComment,
  fetchComments,
  fetchLikedDesignIds,
  fetchPublicDesignById,
  likeDesign,
  recordShare,
  unlikeDesign,
} from "../lib/community.js"

const displayDate = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  : ""

export default function DesignPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const previewRef = useRef(null)
  const likeBusy = useRef(false)
  const [view, setView] = useState("pixel")
  const [design, setDesign] = useState(null)
  const [liked, setLiked] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState("")
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    setNotFound(false)
    try {
      const next = await fetchPublicDesignById(id)
      setDesign(next)
      if (!next) {
        setNotFound(true)
        return
      }
      const [messages, likes] = await Promise.all([
        fetchComments(id).catch(() => []),
        user ? fetchLikedDesignIds(user.id).catch(() => new Set()) : Promise.resolve(new Set()),
      ])
      setComments(messages)
      setLiked(likes.has(id))
    } catch (e) {
      setError(e.message || "Could not open this design")
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (view === "pixel" && design?.grid?.length && previewRef.current) {
      renderGridToCanvas(previewRef.current, design.grid)
    }
  }, [design?.grid, view])

  useEffect(() => {
    if (!supabase || !design?.id) return
    const channel = supabase.channel("design-social-" + id)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "post_likes", filter: "design_id=eq." + id,
      }, () => {
        fetchPublicDesignById(id).then((next) => next && setDesign(next)).catch(() => {})
      })
      .on("postgres_changes", {
        event: "*", schema: "public", table: "post_comments", filter: "design_id=eq." + id,
      }, () => {
        fetchComments(id).then(setComments).catch(() => {})
        fetchPublicDesignById(id).then((next) => next && setDesign(next)).catch(() => {})
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [design?.id, id])

  const toggleLike = async () => {
    if (!user) return showToast("sign in to like")
    if (likeBusy.current) return
    likeBusy.current = true
    const previous = liked
    setLiked(!previous)
    setDesign((item) => item ? {
      ...item,
      likeCount: Math.max(0, (item.likeCount ?? 0) + (previous ? -1 : 1)),
    } : item)
    try {
      if (previous) await unlikeDesign(id)
      else await likeDesign(id)
    } catch (e) {
      setLiked(previous)
      setDesign((item) => item ? {
        ...item,
        likeCount: Math.max(0, (item.likeCount ?? 0) + (previous ? 1 : -1)),
      } : item)
      showToast(e.message || "Couldn't update like")
    } finally {
      likeBusy.current = false
    }
  }

  const share = async () => {
    const result = await copyDesignLink(id)
    showToast(result.copied ? "design link copied" : "copy this link: " + result.url)
    if (result.copied && user) recordShare(id).catch(() => {})
  }

  const submitComment = async (event) => {
    event.preventDefault()
    const body = commentText.trim()
    if (!body) return
    if (!user) return showToast("sign in to comment")
    if (posting) return
    setPosting(true)
    try {
      const saved = await addComment(id, body)
      setComments((previous) => [...previous, {
        ...saved,
        profiles: {
          username: profile?.username,
          display_name: profile?.display_name,
          profile_photo: profile?.profile_photo,
        },
      }])
      setDesign((item) => item ? { ...item, commentCount: (item.commentCount ?? 0) + 1 } : item)
      setCommentText("")
      showToast("comment added")
    } catch (e) {
      showToast(e.message || "Couldn't post comment")
    } finally {
      setPosting(false)
    }
  }

  const removeComment = async (commentId) => {
    try {
      await deleteComment(commentId)
      setComments((previous) => previous.filter((item) => item.id !== commentId))
      setDesign((item) => item ? { ...item, commentCount: Math.max(0, (item.commentCount ?? 0) - 1) } : item)
      showToast("comment deleted")
    } catch (e) {
      showToast(e.message || "Couldn't delete comment")
    }
  }

  if (loading) return (
    <PageShell><div className="px-page social-detail"><p className="muted">loading design…</p></div></PageShell>
  )

  if (!design || notFound) return (
    <PageShell>
      <div className="px-page social-detail">
        <div className="px-panel px-panel--pad social-empty">
          <p className="muted">{error || "This design is private, unavailable or has been deleted."}</p>
          {error && <button type="button" className="px-btn px-btn--sm px-btn--white" onClick={load}>retry</button>}
          <Link to="/community?tab=explore" className="px-btn px-btn--sm px-btn--mint">back to explore</Link>
        </div>
      </div>
    </PageShell>
  )

  const creator = design.creator
  const authorName = creator?.displayName || creator?.username || "creator"
  const avatar = creator?.profilePhoto ? (
    <img src={creator.profilePhoto} className="comm-avatar" alt="" />
  ) : (
    <span className="comm-avatar comm-avatar--none">{authorName.slice(0, 1).toUpperCase()}</span>
  )

  return (
    <PageShell>
      <div className="px-page social-detail">
        <div className="design-page">
          <section className="px-panel px-panel--pad design-page-main">
            {creator?.username && (
              <Link className="social-detail-creator" to={"/u/" + creator.username}>
                {avatar}<strong>{authorName}</strong>
              </Link>
            )}
            <h1 className="px-section-title" style={{ margin: 0 }}>{design.name}</h1>
            <div className="social-detail-switch">
              <button type="button" className={"px-btn px-btn--sm " + (view === "pixel" ? "px-btn--active" : "px-btn--white")} onClick={() => setView("pixel")}>2D artwork</button>
              <button type="button" className={"px-btn px-btn--sm " + (view === "3d" ? "px-btn--active" : "px-btn--white")} onClick={() => setView("3d")}>3D model</button>
              <span className="muted">{design.size}×{design.size}</span>
            </div>
            {view === "pixel" ? (
              <div className="social-detail-art">
                <canvas ref={previewRef} width={640} height={640} aria-label={"Pixel art preview for " + design.name} />
              </div>
            ) : (
              <div className="social-detail-3d">
                <VoxelViewport
                  grid={design.grid}
                  size={design.size}
                  extrude={design.extrude}
                  randomLift={design.randomLift}
                  showGrid={false}
                  autoRotate
                />
              </div>
            )}
            <div className="social-detail-actions">
              <button type="button" className={"px-btn px-btn--sm " + (liked ? "px-btn--active" : "px-btn--white")} onClick={toggleLike}>
                {liked ? "♥ liked" : "♡ like"} · {design.likeCount ?? 0}
              </button>
              <a className="px-btn px-btn--sm px-btn--white" href="#comments">comments · {design.commentCount ?? 0}</a>
              <button type="button" className="px-btn px-btn--sm px-btn--white" onClick={share}>↗ copy link</button>
              <button type="button" className="px-btn px-btn--sm px-btn--mint" onClick={() => navigate("/?remix=" + id)}>remix artwork</button>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Published {displayDate(design.createdAt)} · {design.shareCount ?? 0} shares</p>
          </section>

          <section className="px-panel px-panel--pad comments-panel" id="comments">
            <h2 className="px-panel-title">comments ({design.commentCount ?? 0})</h2>
            <form className="comment-form" onSubmit={submitComment}>
              <input
                className="text-input"
                placeholder={user ? "Write a comment…" : "Sign in to comment"}
                value={commentText}
                maxLength={500}
                disabled={!user || posting}
                onChange={(event) => setCommentText(event.target.value)}
              />
              <button className="px-btn px-btn--sm px-btn--mint" type="submit" disabled={!user || posting || !commentText.trim()}>
                {posting ? "posting…" : "post"}
              </button>
            </form>
            {!comments.length ? <p className="muted">No comments yet. Start the conversation.</p> : (
              <ul className="comment-list">
                {comments.map((comment) => {
                  const author = comment.profiles
                  return (
                    <li key={comment.id}>
                      <div className="comm-creator">
                        <span className="comm-avatar comm-avatar--none comm-avatar--sm">{(author?.display_name || author?.username || "u").slice(0, 1).toUpperCase()}</span>
                        {author?.username ? (
                          <Link to={"/u/" + author.username} className="comm-creator-name">{author.display_name || author.username}</Link>
                        ) : <strong>{author?.display_name || "user"}</strong>}
                      </div>
                      <p className="comment-body">{comment.body}</p>
                      <div className="comment-foot">
                        <span className="muted">{displayDate(comment.created_at)}</span>
                        {user?.id === comment.user_id && (
                          <button className="link-danger" onClick={() => removeComment(comment.id)} type="button">delete</button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
        {toast && <div className="px-toast" role="status">{toast}</div>}
      </div>
    </PageShell>
  )
}
