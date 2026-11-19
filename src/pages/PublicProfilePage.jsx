import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import PostCard from "../components/PostCard.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
import { copyDesignLink } from "../lib/share.js"
import {
  asDesignPost,
  fetchIsFollowing,
  fetchLikedDesignIds,
  fetchProfileByUsername,
  fetchPublicPosts,
  fetchUserPublicDesigns,
  followUser,
  likeDesign,
  recordShare,
  unfollowUser,
  unlikeDesign,
} from "../lib/community.js"

const monthYear = (date) => date ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short" }) : ""

export default function PublicProfilePage() {
  const { username } = useParams()
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [likedIds, setLikedIds] = useState(new Set())
  const [following, setFollowing] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const busyLikes = useRef(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const author = await fetchProfileByUsername(username)
      setProfile(author)
      if (!author) {
        setPosts([])
        return
      }

      const designs = await fetchUserPublicDesigns(author.id)
      let publishedPosts = []
      try {
        publishedPosts = await fetchPublicPosts({ userId: author.id, limit: 100 })
      } catch {
        publishedPosts = []
      }
      const byDesign = new Map()
      for (const post of publishedPosts) {
        if (post.designs?.id && !byDesign.has(post.designs.id)) byDesign.set(post.designs.id, post)
      }
      const visible = designs.map((design) => {
        const published = byDesign.get(design.id)
        const mapped = asDesignPost(design)
        mapped.profiles = { username: author.username, display_name: author.display_name, profile_photo: author.profile_photo }
        return published ? {
          ...mapped,
          id: published.id,
          body: published.body,
          created_at: published.created_at,
        } : mapped
      })
      visible.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setPosts(visible)
      if (user) {
        const [isFollowing, likes] = await Promise.all([
          fetchIsFollowing(user.id, author.id),
          fetchLikedDesignIds(user.id),
        ])
        setFollowing(isFollowing)
        setLikedIds(likes)
      } else {
        setFollowing(false)
        setLikedIds(new Set())
      }
    } catch (e) {
      setError(e.message || "Couldn't load this creator")
    } finally {
      setLoading(false)
    }
  }, [username, user?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!profile || !supabase) return
    const channel = supabase.channel("social-profile-" + profile.id)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "follows",
        filter: "following_id=eq." + profile.id,
      }, async () => {
        fetchProfileByUsername(username).then((next) => next && setProfile(next)).catch(() => {})
        if (user) fetchIsFollowing(user.id, profile.id).then(setFollowing).catch(() => {})
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, username, user?.id])

  const toggleFollow = async () => {
    if (!user) return showToast("sign in to follow")
    if (!profile || busyFollow) return
    setBusyFollow(true)
    try {
      if (following) await unfollowUser(profile.id)
      else await followUser(profile.id)
      setFollowing(!following)
      setProfile((previous) => previous ? {
        ...previous,
        follower_count: Math.max(0, (previous.follower_count ?? 0) + (following ? -1 : 1)),
      } : previous)
    } catch (e) {
      showToast(e.message || "Couldn't update follow")
    } finally {
      setBusyFollow(false)
    }
  }

  const toggleLike = async (post) => {
    if (!user) return showToast("sign in to like")
    const id = post.designs?.id
    if (!id || busyLikes.current.has(id)) return
    busyLikes.current.add(id)
    const previousLiked = likedIds.has(id)
    const update = (wasLiked) => {
      setLikedIds((previous) => {
        const next = new Set(previous)
        if (wasLiked) next.delete(id)
        else next.add(id)
        return next
      })
      setPosts((previous) => previous.map((item) => item.designs?.id === id ? {
        ...item,
        designs: { ...item.designs, like_count: Math.max(0, (item.designs.like_count ?? 0) + (wasLiked ? -1 : 1)) },
      } : item))
    }
    update(previousLiked)
    try {
      if (previousLiked) await unlikeDesign(id)
      else await likeDesign(id)
    } catch (e) {
      update(!previousLiked)
      showToast(e.message || "Couldn't update like")
    } finally {
      busyLikes.current.delete(id)
    }
  }

  const share = async (post) => {
    const id = post.designs?.id
    if (!id) return
    const result = await copyDesignLink(id)
    showToast(result.copied ? "design link copied" : "copy this link: " + result.url)
    if (result.copied && user) recordShare(id).catch(() => {})
  }

  if (loading) return <PageShell><div className="px-page"><p className="muted">loading creator and designs…</p></div></PageShell>

  if (!profile) return (
    <PageShell>
      <div className="px-page social-profile">
        <div className="px-panel px-panel--pad social-empty">
          <p className="muted">{error || "This creator could not be found."}</p>
          <button className="px-btn px-btn--sm px-btn--white" onClick={load}>retry</button>
        </div>
      </div>
    </PageShell>
  )

  const isSelf = user?.id === profile.id
  const title = profile.display_name || profile.username

  return (
    <PageShell>
      <div className="px-page social-profile">
        <div className="px-panel px-panel--pad profile-head">
          {profile.profile_photo ? (
            <img src={profile.profile_photo} alt="" className="comm-avatar comm-avatar--lg" />
          ) : (
            <span className="comm-avatar comm-avatar--none comm-avatar--lg">{title?.slice(0, 1).toUpperCase()}</span>
          )}
          <div className="profile-head-info">
            <div className="profile-title-line">
              <h1 className="px-section-title" style={{ margin: 0 }}>{title}</h1>
              {!isSelf && (
                <button
                  type="button"
                  className={"px-btn px-btn--sm " + (following ? "px-btn--white" : "px-btn--mint")}
                  disabled={busyFollow}
                  onClick={toggleFollow}
                >
                  {following ? "following" : "follow"}
                </button>
              )}
            </div>
            <p className="muted" style={{ margin: "5px 0" }}>@{profile.username}</p>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-counts">
              <span><strong>{posts.length}</strong> public designs</span>
              <span><strong>{profile.follower_count ?? 0}</strong> followers</span>
              <span><strong>{profile.following_count ?? 0}</strong> following</span>
              <span className="muted">joined {monthYear(profile.created_at)}</span>
            </div>
          </div>
        </div>

        <h2 className="social-profile-title">Artwork by {title}</h2>
        {error && <p className="social-error" role="alert">{error}</p>}
        {posts.length ? (
          <div className="social-feed">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={likedIds.has(post.designs?.id)}
                onToggleLike={toggleLike}
                onShare={share}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : (
          <div className="px-panel px-panel--pad social-empty">
            <p className="muted">This creator hasn't published any designs yet.</p>
          </div>
        )}
        {toast && <div className="px-toast" role="status">{toast}</div>}
      </div>
    </PageShell>
  )
}
