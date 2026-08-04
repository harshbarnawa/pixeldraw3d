import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import PostCard from "../components/PostCard.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
import {
  deletePost,
  fetchLikedPostIds,
  fetchPublicPosts,
  likePost,
  recordShare,
  searchUsers,
  unlikePost,
} from "../lib/community.js"

const SORTS = ["explore", "trending", "recent"]

export default function CommunityPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [sort, setSort] = useState("explore")
  const [posts, setPosts] = useState([])
  const [likedPostIds, setLikedPostIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const [term, setTerm] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (user) fetchLikedPostIds(user.id).then(setLikedPostIds).catch(() => {})
    else setLikedPostIds(new Set())
  }, [user])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPosts(await fetchPublicPosts({ sort }))
    } catch (e) {
      showToast(e.message)
    } finally {
      setLoading(false)
    }
  }, [sort, showToast])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: new posts stream into the feed.
  useEffect(() => {
    const channel = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const toggleLike = async (post) => {
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

  const removePost = async (postId) => {
    try {
      await deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleShare = async (post) => {
    if (!post.designs) return
    const url = `${window.location.origin}/d/${post.designs.id}`
    try {
      await navigator.clipboard.writeText(url)
      showToast("link copied")
    } catch {
      showToast(url)
    }
    if (user) recordShare(post.designs.id).catch(() => {})
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

  const renderAvatar = (author) =>
    author?.profile_photo ? (
      <img src={author.profile_photo} alt="" className="comm-avatar comm-avatar--sm" />
    ) : (
      <span className="comm-avatar comm-avatar--none comm-avatar--sm">
        {(author?.display_name || author?.username || "u").slice(0, 1).toUpperCase()}
      </span>
    )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead kicker="06 · community" title="explore" sub="designs and words shared by the community." />

        {/* ----- user search ----- */}
        <form
          className="comm-search-bar"
          onSubmit={(e) => {
            e.preventDefault()
            runSearch(term)
          }}
        >
          <input
            className="text-input comm-search"
            placeholder="search users (username or name)…"
            value={term}
            onChange={(e) => runSearch(e.target.value)}
          />
          <button type="submit" className="px-btn px-btn--white" disabled={!term.trim()}>
            search
          </button>
        </form>

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

        {/* ----- post feed ----- */}
        {loading ? (
          <p className="muted comm-empty">loading the feed…</p>
        ) : posts.length === 0 ? (
          <div className="px-panel px-panel--pad comm-empty">
            <p style={{ fontSize: 30, margin: 0 }}>🧊</p>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              nothing posted yet — make a design public to share it with the community.
            </p>
          </div>
        ) : (
          <div className="post-feed">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                liked={likedPostIds.has(p.id)}
                onToggleLike={toggleLike}
                onShare={handleShare}
                onDelete={removePost}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
