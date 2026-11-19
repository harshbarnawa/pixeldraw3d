import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import PostCard from "../components/PostCard.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
import { copyDesignLink } from "../lib/share.js"
import {
  asDesignPost,
  deletePost,
  fetchLikedDesignIds,
  fetchLikedPostIds,
  fetchPublicDesigns,
  fetchPublicPosts,
  likeDesign,
  likePost,
  recordShare,
  searchUsers,
  unlikeDesign,
  unlikePost,
} from "../lib/community.js"

export default function CommunityPage() {
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const [posts, setPosts] = useState([])
  const [likedDesignIds, setLikedDesignIds] = useState(new Set())
  const [likedPostIds, setLikedPostIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [term, setTerm] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const busyLikes = useRef(new Set())

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [designResult, postResult] = await Promise.allSettled([
        fetchPublicDesigns({ sort: "recent", limit: 100 }),
        fetchPublicPosts({ sort: "recent", limit: 100 }),
      ])
      if (designResult.status === "rejected" && postResult.status === "rejected") {
        throw designResult.reason || postResult.reason
      }

      const designs = designResult.status === "fulfilled" ? designResult.value : []
      const published = postResult.status === "fulfilled" ? postResult.value : []
      const byDesign = new Map(designs.map((design) => [design.id, asDesignPost(design)]))
      const attached = new Set()
      const textPosts = []

      for (const post of published) {
        if (!post.design_id) {
          textPosts.push(post)
          continue
        }
        const linkedDesign = post.designs
        if (!linkedDesign?.is_public || attached.has(linkedDesign.id)) continue
        attached.add(linkedDesign.id)

        const existing = byDesign.get(linkedDesign.id)
        byDesign.set(linkedDesign.id, {
          ...(existing || post),
          id: post.id,
          synthetic: false,
          created_at: post.created_at,
          body: post.body || "",
          user_id: post.user_id,
          designs: existing?.designs || linkedDesign,
          profiles: post.profiles || existing?.profiles,
        })
      }

      const next = [...byDesign.values(), ...textPosts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setPosts(next)
      setError(
        designResult.status === "rejected" || postResult.status === "rejected"
          ? "Some artwork or captions could not load. Try refresh."
          : "",
      )
    } catch (e) {
      setError(e.message || "Couldn't load the feed")
      if (!silent) setPosts([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true
    if (!user) {
      setLikedDesignIds(new Set())
      setLikedPostIds(new Set())
      return
    }
    Promise.all([fetchLikedDesignIds(user.id), fetchLikedPostIds(user.id)])
      .then(([designIds, postIds]) => {
        if (!active) return
        setLikedDesignIds(designIds)
        setLikedPostIds(postIds)
      })
      .catch(() => {})
    return () => { active = false }
  }, [user?.id])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel("community-unified-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "designs" }, () => load(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  useEffect(() => {
    if (!term.trim()) {
      setResults([])
      setSearching(false)
      return
    }
    let alive = true
    setSearching(true)
    const timer = setTimeout(() => {
      searchUsers(term)
        .then((found) => { if (alive) setResults(found) })
        .catch(() => { if (alive) setResults([]) })
        .finally(() => { if (alive) setSearching(false) })
    }, 300)
    return () => { alive = false; clearTimeout(timer) }
  }, [term])

  const toggleLike = async (post) => {
    if (!user) {
      showToast("sign in to like designs")
      return
    }
    const designId = post.designs?.id || null
    const key = designId ? "d:" + designId : "p:" + post.id
    if (busyLikes.current.has(key)) return
    busyLikes.current.add(key)

    const current = designId ? likedDesignIds.has(designId) : likedPostIds.has(post.id)
    const setter = designId ? setLikedDesignIds : setLikedPostIds
    const identity = designId || post.id
    const mutateLikes = (wasLiked) => {
      setter((previous) => {
        const next = new Set(previous)
        if (wasLiked) next.delete(identity)
        else next.add(identity)
        return next
      })
      const amount = wasLiked ? -1 : 1
      setPosts((previous) => previous.map((item) => {
        if (designId && item.designs?.id === designId) {
          return { ...item, designs: { ...item.designs, like_count: Math.max(0, (item.designs.like_count ?? 0) + amount) } }
        }
        if (!designId && item.id === post.id) {
          return { ...item, like_count: Math.max(0, (item.like_count ?? 0) + amount) }
        }
        return item
      }))
    }

    mutateLikes(current)
    try {
      if (designId) {
        if (current) await unlikeDesign(designId)
        else await likeDesign(designId)
      } else {
        if (current) await unlikePost(post.id)
        else await likePost(post.id)
      }
    } catch (e) {
      mutateLikes(!current)
      showToast(e.message || "Couldn't update like")
    } finally {
      busyLikes.current.delete(key)
    }
  }

  const share = async (post) => {
    const id = post.designs?.id
    if (!id) return
    const result = await copyDesignLink(id)
    showToast(result.copied ? "design link copied" : "copy this link: " + result.url)
    if (result.copied && user) recordShare(id).catch(() => {})
  }

  const remove = async (id) => {
    try {
      await deletePost(id)
      setPosts((previous) => previous.filter((post) => post.id !== id))
      showToast("post deleted")
    } catch (e) {
      showToast(e.message || "Couldn't delete the post")
    }
  }

  const renderAvatar = (author) => author.profile_photo ? (
    <img src={author.profile_photo} alt="" className="comm-avatar" />
  ) : (
    <span className="comm-avatar comm-avatar--none">
      {(author.display_name || author.username || "u").slice(0, 1).toUpperCase()}
    </span>
  )

  return (
    <PageShell>
      <div className="px-page social-page">
        <SectionHead kicker="06 · community" title="feed" sub="Public artwork, creator posts and conversations in one place." />

        <div className="social-feed-toolbar">
          <span className="muted">Latest from the community</span>
          <button type="button" className="px-btn px-btn--sm px-btn--white" onClick={() => load()} aria-label="Refresh feed">refresh</button>
        </div>

        <div className="comm-search-bar">
          <input
            className="text-input comm-search"
            type="search"
            placeholder="search creators..."
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>

        {term.trim() && (
          <div className="px-panel px-panel--pad comm-search-results">
            {searching ? <p className="muted">searching…</p> : results.length === 0 ? (
              <p className="muted">no creators found</p>
            ) : (
              <ul className="user-results">
                {results.map((author) => (
                  <li key={author.username}>
                    <Link className="comm-creator" to={"/u/" + author.username}>
                      {renderAvatar(author)}
                      <span className="comm-creator-name">{author.display_name || author.username}</span>
                      <span className="muted">@{author.username}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <div className="px-panel px-panel--pad social-error" role="alert">{error} <button className="px-btn px-btn--sm px-btn--white" onClick={() => load()}>retry</button></div>}

        {loading ? (
          <div className="px-panel px-panel--pad social-empty"><p className="muted">loading community…</p></div>
        ) : posts.length === 0 ? (
          <div className="px-panel px-panel--pad social-empty">
            <p className="muted">No artwork posted yet. Publish a design from My Designs to start the feed.</p>
          </div>
        ) : (
          <div className="social-feed">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={post.designs ? likedDesignIds.has(post.designs.id) : likedPostIds.has(post.id)}
                onToggleLike={toggleLike}
                onShare={share}
                onDelete={post.designs ? undefined : remove}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
        {toast && <div className="px-toast" role="status">{toast}</div>}
      </div>
    </PageShell>
  )
}
