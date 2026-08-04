import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import CommunityCard from "../components/CommunityCard.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import {
  fetchLikedDesignIds,
  fetchPublicDesigns,
  likeDesign,
  recordShare,
  searchUsers,
  unlikeDesign,
} from "../lib/community.js"

const SORTS = ["trending", "recent", "popular"]

export default function CommunityPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [sort, setSort] = useState("recent")
  const [designs, setDesigns] = useState([])
  const [likedIds, setLikedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const [term, setTerm] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (user) fetchLikedDesignIds(user.id).then(setLikedIds).catch(() => {})
    else setLikedIds(new Set())
  }, [user])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setDesigns(await fetchPublicDesigns({ sort }))
    } catch (e) {
      showToast(e.message)
    } finally {
      setLoading(false)
    }
  }, [sort, showToast])

  useEffect(() => {
    load()
  }, [load])

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

  const handleSearch = async (value) => {
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

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead kicker="06 · community" title="explore" sub="pixels from across the world, shared by the community." />

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
          <input
            className="text-input comm-search"
            placeholder="search users @username…"
            value={term}
            onChange={(e) => handleSearch(e.target.value)}
          />
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
                      {u.profile_photo ? (
                        <img src={u.profile_photo} alt="" className="comm-avatar" />
                      ) : (
                        <span className="comm-avatar comm-avatar--none">
                          {(u.display_name || u.username || "u").slice(0, 1).toUpperCase()}
                        </span>
                      )}
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
