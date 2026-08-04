import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import VoxelViewport from "../components/VoxelViewport.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
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

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""

export default function DesignPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [design, setDesign] = useState(null)
  const [liked, setLiked] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState("")
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetchPublicDesignById(id)
      setDesign(d)
      if (!d) {
        setNotFound(true)
        return
      }
      setComments(await fetchComments(id))
      if (user) setLiked((await fetchLikedDesignIds(user.id)).has(id))
    } catch (e) {
      showToast(e.message)
    } finally {
      setLoading(false)
    }
  }, [id, user, showToast])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: fresh like counts + live comments for this design.
  useEffect(() => {
    if (!design) return
    const channel = supabase
      .channel(`design:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes", filter: `design_id=eq.${id}` },
        () => {
          fetchPublicDesignById(id)
            .then((d) => d && setDesign(d))
            .catch(() => {})
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `design_id=eq.${id}` },
        (payload) => {
          setComments((prev) => [...prev, payload.new])
          setDesign((d) => (d ? { ...d, commentCount: d.commentCount + 1 } : d))
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [design?.id, id])

  const toggleLike = async () => {
    if (!user) {
      showToast("sign in to like")
      return
    }
    const next = !liked
    setLiked(next)
    setDesign((d) => (d ? { ...d, likeCount: Math.max(0, d.likeCount + (next ? 1 : -1)) } : d))
    try {
      if (next) await likeDesign(id)
      else await unlikeDesign(id)
    } catch (e) {
      setLiked(!next)
      setDesign((d) => (d ? { ...d, likeCount: Math.max(0, d.likeCount + (next ? -1 : 1)) } : d))
      showToast(e.message)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/d/${id}`
    try {
      await navigator.clipboard.writeText(url)
      showToast("link copied")
    } catch {
      showToast(url)
    }
    if (user) recordShare(id).catch(() => {})
  }

  const postComment = async (e) => {
    e.preventDefault()
    const body = commentText.trim()
    if (!body) {
      showToast("write a comment")
      return
    }
    if (!user) {
      showToast("sign in to comment")
      return
    }
    setPosting(true)
    try {
      const c = await addComment(id, body)
      setComments((prev) => [
        ...prev,
        { ...c, profiles: { username: profile?.username, display_name: profile?.display_name, profile_photo: profile?.profile_photo } },
      ])
      setDesign((d) => (d ? { ...d, commentCount: d.commentCount + 1 } : d))
      setCommentText("")
    } catch (e) {
      showToast(e.message)
    } finally {
      setPosting(false)
    }
  }

  const removeComment = async (commentId) => {
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setDesign((d) => (d ? { ...d, commentCount: Math.max(0, d.commentCount - 1) } : d))
    } catch (e) {
      showToast(e.message)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="px-page">
          <p className="muted">loading design…</p>
        </div>
      </PageShell>
    )
  }

  if (notFound || !design) {
    return (
      <PageShell>
        <div className="px-page">
          <div className="px-panel px-panel--pad comm-empty">
            <p style={{ fontSize: 30, margin: 0 }}>🧊</p>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              this design is private or doesn't exist.
            </p>
          </div>
        </div>
      </PageShell>
    )
  }

  const creator = design.creator

  return (
    <PageShell>
      <div className="px-page">
        <div className="design-page">
          <div className="px-panel px-panel--pad design-page-main">
            <h1 className="px-section-title" style={{ margin: "0 0 14px" }}>
              {design.name}
            </h1>
            <div className="design-viewport">
              <VoxelViewport
                grid={design.grid}
                size={design.size}
                extrude={design.extrude}
                randomLift={design.randomLift}
                showGrid={false}
                autoRotate
              />
            </div>
            <div className="design-actions">
              <button
                type="button"
                className={`px-btn px-btn--sm ${liked ? "px-btn--active" : "px-btn--white"}`}
                onClick={toggleLike}
              >
                ♥ {design.likeCount} {liked ? "liked" : "like"}
              </button>
              <button type="button" className="px-btn px-btn--sm px-btn--white" onClick={handleShare}>
                ↗ share
              </button>
              <button type="button" className="px-btn px-btn--sm px-btn--mint" onClick={() => navigate(`/?remix=${id}`)}>
                ⟲ remix
              </button>
              {creator && (
                <Link to={`/u/${creator.username}`} className="comm-creator design-creator">
                  {creator.profilePhoto ? (
                    <img src={creator.profilePhoto} alt="" className="comm-avatar" />
                  ) : (
                    <span className="comm-avatar comm-avatar--none">
                      {(creator.displayName || creator.username || "u").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="comm-creator-name">{creator.displayName || creator.username}</span>
                </Link>
              )}
            </div>
          </div>

          <div className="px-panel px-panel--pad comments-panel">
            <h3 className="px-panel-title">
              <span>comments ({design.commentCount})</span>
            </h3>

            <form className="comment-form" onSubmit={postComment}>
              <input
                className="text-input"
                placeholder={user ? "say something nice…" : "sign in to comment"}
                value={commentText}
                disabled={!user}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" className="px-btn px-btn--sm px-btn--mint" disabled={posting || !user}>
                {posting ? "posting…" : "post"}
              </button>
            </form>

            {comments.length === 0 ? (
              <p className="muted">no comments yet — be the first.</p>
            ) : (
              <ul className="comment-list">
                {comments.map((c) => {
                  const author = c.profiles
                  return (
                    <li key={c.id}>
                      <Link to={`/u/${author?.username}`} className="comm-creator">
                        {author?.profile_photo ? (
                          <img src={author.profile_photo} alt="" className="comm-avatar comm-avatar--sm" />
                        ) : (
                          <span className="comm-avatar comm-avatar--none comm-avatar--sm">
                            {(author?.display_name || author?.username || "u").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="comm-creator-name">{author?.display_name || author?.username || "user"}</span>
                      </Link>
                      <p className="comment-body">{c.body}</p>
                      <div className="comment-foot">
                        <span className="muted">{fmtDate(c.created_at)}</span>
                        {user?.id === c.user_id && (
                          <button type="button" className="link-danger" onClick={() => removeComment(c.id)}>
                            delete
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
