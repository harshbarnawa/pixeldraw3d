import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import CommunityCard from "../components/CommunityCard.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
import {
  createPost,
  deletePost,
  fetchLikedDesignIds,
  fetchLikedPostIds,
  fetchPosts,
  fetchPublicDesigns,
  likeDesign,
  likePost,
  recordShare,
  searchUsers,
  unlikeDesign,
  unlikePost,
} from "../lib/community.js"

const SORTS = ["trending", "recent", "popular"]

export default function CommunityPage() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()

  const [sort, setSort] = useState("recent")
  const [designs, setDesigns] = useState([])
  const [likedIds, setLikedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const [posts, setPosts] = useState([])
  const [likedPostIds, setLikedPostIds] = useState(new Set())
  const [postText, setPostText] = useState("")
  const [posting, setPosting] = useState(false)

  const [term, setTerm] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (user) {
      fetchLikedDesignIds(user.id).then(setLikedIds).catch(() => {})
      fetchLikedPostIds(user.id).then(setLikedPostIds).catch(() => {})
    } else {
      setLikedIds(new Set())
      setLikedPostIds(new Set())
    }
  }, [user])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [designList, postList] = await Promise.all([fetchPublicDesigns({ sort }), fetchPosts()])
      setDesigns(designList)
      setPosts(postList)
    } catch (e) {
      showToast(e.message)
    } finally {
      setLoading(false)
    }
  }, [sort, showToast])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: new text posts stream into the feed.
  useEffect(() => {
    const channel = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        fetchPosts().then(setPosts).catch(() => {})
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const submitPost = async (e) => {
    e.preventDefault()
    const body = postText.trim()
    if (!body) {
      showToast("write something first")
      return
    }
    if (!user) {
      showToast("sign in to post")
      return
    }
    setPosting(true)
    try {
      const p = await createPost(body)
      setPosts((prev) => [
        { ...p, profiles: { username: profile?.username, display_name: profile?.display_name, profile_photo: profile?.profile_photo } },
        ...prev,
      ])
      setPostText("")
      showToast("posted to the community ✨")
    } catch (e) {
      showToast(e.message)
    } finally {
      setPosting(false)
    }
  }

  const removePost = async (postId) => {
    try {
      await deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (e) {
      showToast(e.message)
    }
  }

  const togglePostLike = async (post) => {
    if (!user) {
      showToast("sign in to like")
      return
    }
    const on = likedPostIds.has(post.id)
    setLikedPostIds((prev) => {
      const n = new Set(prev)
      if (on) n.delete(post.id)
      else n.add(post.id)
      return n
    })
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, like_count: Math.max(0, p.like_count + (on ? -1 : 1)) } : p)),
    )
    try {
      if (on) await unlikePost(post.id)
      else await likePost(post.id)
    } catch (e) {
      setLikedPostIds((prev) => {
        const n = new Set(prev)
        if (on) n.add(post.id)
        else n.delete(post.id)
        return n
      })
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, like_count: Math.max(0, p.like_count + (on ? 1 : -1)) } : p)),
      )
      showToast(e.message)
    }
  }

  const toggleLike = async (design) => {
    if (!user) {
      showToast("sign in to like")
      return
    }
    const on = likedIds.has(design.id)
    const delta = on ? -1 : 1
    setLikedIds((prev) => {
      const n = new Set(prev)
      if (on) n.delete(design.id)
      else n.add(design.id)
      return n
    })
    setDesigns((prev) =>
      prev.map((d) => (d.id === design.id ? { ...d, likeCount: Math.max(0, d.likeCount + delta) } : d)),
    )
    try {
      if (on) await unlikeDesign(design.id)
      else await likeDesign(design.id)
    } catch (e) {
      setLikedIds((prev) => {
        const n = new Set(prev)
        if (on) n.add(design.id)
        else n.delete(design.id)
        return n
      })
      setDesigns((prev) =>
        prev.map((d) => (d.id === design.id ? { ...d, likeCount: Math.max(0, d.likeCount - delta) } : d)),
      )
      showToast(e.message)
    }
  }

  const handleShare = async (design) => {
    const url = `${window.location.origin}/d/${design.id}`
    try {
      await navigator.clipboard.writeText(url)
      showToast("link copied")
    } catch {
      showToast(url)
    }
    if (user) recordShare(design.id).catch(() => {})
  }

  const runSearch = async (value) => {
    setTerm(value)
    if (!value.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      setResults(await searchUsers(value))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const renderAvatar = (author, size = "") =>
    author?.profile_photo ? (
      <img src={author.profile_photo} alt="" className={`comm-avatar ${size}`.trim()} />
    ) : (
      <span className={`comm-avatar comm-avatar--none ${size}`.trim()}>
        {(author?.display_name || author?.username || "u").slice(0, 1).toUpperCase()}
      </span>
    )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead kicker="06 · community" title="explore" sub="pixels from across the world, shared by the community." />

        {/* ----- composer + search ----- */}
        <div className="px-panel px-panel--pad comm-top">
          <form className="post-composer" onSubmit={submitPost}>
            {renderAvatar(profile, "comm-avatar--sm")}
            <input
              className="text-input post-input"
              placeholder={user ? "share something with the community…" : "sign in to post"}
              value={postText}
              disabled={!user}
              onChange={(e) => setPostText(e.target.value)}
            />
            <button type="submit" className="px-btn px-btn--mint" disabled={posting || !user}>
              {posting ? "posting…" : "post"}
            </button>
          </form>
          <form
            className="post-composer"
            onSubmit={(e) => {
              e.preventDefault()
              runSearch(term)
            }}
          >
            <input
              className="text-input post-input"
              placeholder="search users (username or name)…"
              value={term}
              onChange={(e) => runSearch(e.target.value)}
            />
            <button type="submit" className="px-btn px-btn--white" disabled={!term.trim()}>
              search
            </button>
          </form>
        </div>

        {term.trim() && (
          <div className="px-panel px-panel--pad comm-search-results">
            {searching ? (
              <p className="muted">searching…</p>
            ) : results.length === 0 ? (
              <p className="muted">no users found for “{term}”.</p>
            ) : (
              <ul className="user-results">
                {results.map((u) => (
                  <li key={u.username}>
                    <Link to={`/u/${u.username}`} className="comm-creator">
                      {renderAvatar(u)}
                      <span className="comm-creator-name">{u.display_name || u.username}</span>
                      <span className="muted">@{u.username}</span>
                      <span className="comm-stat">♥ {u.follower_count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ----- tabs ----- */}
        <div className="tool-row comm-toolbar">
          <div className="comm-tabs">
            {SORTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`px-btn px-btn--sm ${sort === s ? "px-btn--active" : "px-btn--white"}`}
                onClick={() => setSort(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ----- text posts ----- */}
        {posts.length > 0 && (
          <div className="post-feed">
            {posts.map((p) => (
              <article key={p.id} className="post-card px-panel px-panel--pad">
                <Link to={`/u/${p.profiles?.username}`} className="comm-creator">
                  {renderAvatar(p.profiles, "comm-avatar--sm")}
                  <span className="comm-creator-name">{p.profiles?.display_name || p.profiles?.username || "user"}</span>
                  <span className="muted post-time">{new Date(p.created_at).toLocaleString()}</span>
                </Link>
                <p className="post-body">{p.body}</p>
                <div className="post-actions">
                  <button
                    type="button"
                    className={`comm-stat${likedPostIds.has(p.id) ? " comm-stat--on" : ""}`}
                    onClick={() => togglePostLike(p)}
                  >
                    ♥ {p.like_count}
                  </button>
                  {user?.id === p.user_id && (
                    <button type="button" className="link-danger" onClick={() => removePost(p.id)}>
                      delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ----- designs grid ----- */}
        {loading ? (
          <p className="muted comm-empty">loading the feed…</p>
        ) : designs.length === 0 ? (
          <div className="px-panel px-panel--pad comm-empty">
            <p style={{ fontSize: 30, margin: 0 }}>🧊</p>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              nothing shared yet — save a design and make it public to start the feed.
            </p>
          </div>
        ) : (
          <div className="comm-grid">
            {designs.map((d) => (
              <CommunityCard key={d.id} design={d} liked={likedIds.has(d.id)} onToggleLike={toggleLike} onShare={handleShare} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
