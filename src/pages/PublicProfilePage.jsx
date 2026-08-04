import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import CommunityCard from "../components/CommunityCard.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
import {
  fetchIsFollowing,
  fetchLikedDesignIds,
  fetchProfileByUsername,
  fetchUserPublicDesigns,
  followUser,
  likeDesign,
  recordShare,
  unfollowUser,
  unlikeDesign,
} from "../lib/community.js"

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short" }) : ""

export default function PublicProfilePage() {
  const { username } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [profile, setProfile] = useState(null)
  const [designs, setDesigns] = useState([])
  const [following, setFollowing] = useState(false)
  const [likedIds, setLikedIds] = useState(new Set())
  const [busyFollow, setBusyFollow] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const prof = await fetchProfileByUsername(username)
      setProfile(prof)
      if (!prof) return
      setDesigns(await fetchUserPublicDesigns(prof.id))
      if (user) setFollowing(await fetchIsFollowing(user.id, prof.id))
    } catch (e) {
      showToast(e.message)
    } finally {
      setLoading(false)
    }
  }, [username, user, showToast])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: live follower counts + follow state for this profile.
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`profile-follows:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows", filter: `following_id=eq.${profile.id}` },
        async () => {
          if (user) setFollowing(await fetchIsFollowing(user.id, profile.id).catch(() => false))
          fetchProfileByUsername(username)
            .then((p) => p && setProfile(p))
            .catch(() => {})
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, user, username])

  useEffect(() => {
    if (user) fetchLikedDesignIds(user.id).then(setLikedIds).catch(() => {})
    else setLikedIds(new Set())
  }, [user])

  const toggleFollow = async () => {
    if (!user) {
      showToast("sign in to follow")
      return
    }
    setBusyFollow(true)
    try {
      if (following) {
        await unfollowUser(profile.id)
        setFollowing(false)
        setProfile((p) => (p ? { ...p, follower_count: Math.max(0, p.follower_count - 1) } : p))
      } else {
        await followUser(profile.id)
        setFollowing(true)
        setProfile((p) => (p ? { ...p, follower_count: p.follower_count + 1 } : p))
      }
    } catch (e) {
      showToast(e.message)
    } finally {
      setBusyFollow(false)
    }
  }

  const toggleLike = async (design) => {
    if (!user) {
      showToast("sign in to like")
      return
    }
    const on = likedIds.has(design.id)
    setLikedIds((prev) => {
      const n = new Set(prev)
      if (on) n.delete(design.id)
      else n.add(design.id)
      return n
    })
    setDesigns((prev) =>
      prev.map((d) => (d.id === design.id ? { ...d, likeCount: Math.max(0, d.likeCount + (on ? -1 : 1)) } : d)),
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
        prev.map((d) => (d.id === design.id ? { ...d, likeCount: Math.max(0, d.likeCount + (on ? 1 : -1)) } : d)),
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

  if (loading) return <PageShell><div className="px-page"><p className="muted">loading profile…</p></div></PageShell>

  if (!profile) {
    return (
      <PageShell>
        <div className="px-page">
          <div className="px-panel px-panel--pad comm-empty">
            <p style={{ fontSize: 30, margin: 0 }}>👻</p>
            <p className="muted" style={{ margin: "6px 0 0" }}>no user called “{username}”.</p>
          </div>
        </div>
      </PageShell>
    )
  }

  const isSelf = user?.id === profile.id

  return (
    <PageShell>
      <div className="px-page">
        <div className="px-panel px-panel--pad profile-head">
          {profile.profile_photo ? (
            <img src={profile.profile_photo} alt="" className="comm-avatar comm-avatar--lg" />
          ) : (
            <span className="comm-avatar comm-avatar--none comm-avatar--lg">
              {(profile.display_name || profile.username || "u").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="profile-head-info">
            <div className="profile-title-line">
              <h1 className="px-section-title" style={{ margin: 0 }}>
                {profile.display_name || profile.username}
              </h1>
              {!isSelf && (
                <button
                  type="button"
                  className={`px-btn px-btn--sm ${following ? "px-btn--white" : "px-btn--mint"}`}
                  disabled={busyFollow}
                  onClick={toggleFollow}
                >
                  {following ? "✓ following" : "+ follow"}
                </button>
              )}
            </div>
            <p className="muted" style={{ margin: "2px 0 0" }}>
              @{profile.username}
            </p>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-counts">
              <span><strong>{profile.follower_count}</strong> followers</span>
              <span><strong>{profile.following_count}</strong> following</span>
              <span><strong>{designs.length}</strong> designs</span>
              <span className="muted">member since {fmtDate(profile.created_at)}</span>
            </div>
          </div>
        </div>

        {designs.length === 0 ? (
          <div className="px-panel px-panel--pad comm-empty">
            <p className="muted" style={{ margin: 0 }}>no public designs yet.</p>
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
