// ============================================================
// PixelDraw3D · community data access
//
// Feed, public profiles, follows, likes, comments and shares. Everything here
// is read-mostly against the public RLS policies; writes are the caller's own
// row (follow / like / comment) or the owner's own design. Guests can read the
// feed but the writes require a session (the edge RLS checks enforce that).
// ============================================================

import { supabase } from "./supabase.js"
import { mapCloudDesign } from "./cloudDesigns.js"

const FEED_FIELDS = `
  id, user_id, name, grid, size, extrude, random_lift,
  like_count, comment_count, share_count, is_public, created_at, updated_at,
  profiles!inner(username, display_name, profile_photo, follower_count)
`

export function mapFeedDesign(row) {
  return {
    id: row.id,
    name: row.name,
    grid: row.grid ?? [],
    size: row.size,
    extrude: row.extrude,
    randomLift: row.random_lift,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    shareCount: row.share_count ?? 0,
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    creator: row.profiles
      ? {
          username: row.profiles.username,
          displayName: row.profiles.display_name,
          profilePhoto: row.profiles.profile_photo,
          followerCount: row.profiles.follower_count,
        }
      : null,
  }
}

// ----- feed -----

export async function fetchPublicDesigns({ sort = "recent", limit = 60 } = {}) {
  let q = supabase.from("designs").select(FEED_FIELDS).eq("is_public", true).limit(limit)
  if (sort === "trending") {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    q = q.gte("created_at", cutoff).order("like_count", { ascending: false })
  } else if (sort === "popular") {
    q = q.order("like_count", { ascending: false })
  } else {
    q = q.order("created_at", { ascending: false })
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapFeedDesign)
}

export async function fetchPublicDesignById(id) {
  const { data, error } = await supabase
    .from("designs")
    .select(FEED_FIELDS)
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle()
  if (error) throw error
  return data ? mapFeedDesign(data) : null
}

// Reuse the cloud mapper for a raw public design row (remix flow).
export async function fetchPublicDesignRow(id) {
  const { data, error } = await supabase
    .from("designs")
    .select("id, user_id, name, grid, size, extrude, random_lift, is_public, created_at, updated_at")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle()
  if (error) throw error
  return data ? mapCloudDesign(data) : null
}

// ----- public profiles -----

export async function fetchProfileByUsername(username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, profile_photo, bio, follower_count, following_count, design_count, created_at")
    .eq("username", username)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchUserPublicDesigns(userId) {
  const { data, error } = await supabase
    .from("designs")
    .select(FEED_FIELDS)
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapFeedDesign)
}

export async function searchUsers(term) {
  if (!term.trim()) return []
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, profile_photo, follower_count")
    .ilike("username", `%${term.trim()}%`)
    .limit(20)
  if (error) throw error
  return data ?? []
}

// ----- follows -----

export async function fetchIsFollowing(followerId, followingId) {
  if (!followerId) return false
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export async function followUser(followingId) {
  const { error } = await supabase.from("follows").insert({ following_id: followingId })
  if (error) throw error
}

export async function unfollowUser(followingId) {
  const { error } = await supabase.from("follows").delete().eq("following_id", followingId)
  if (error) throw error
}

// ----- likes -----

export async function fetchLikedDesignIds(userId) {
  if (!userId) return new Set()
  const { data, error } = await supabase.from("post_likes").select("design_id").eq("user_id", userId)
  if (error) throw error
  return new Set((data ?? []).map((d) => d.design_id))
}

export async function likeDesign(designId) {
  const { error } = await supabase.from("post_likes").insert({ design_id: designId })
  if (error) throw error
}

export async function unlikeDesign(designId) {
  const { error } = await supabase.from("post_likes").delete().eq("design_id", designId)
  if (error) throw error
}

// ----- comments -----

export async function fetchComments(designId) {
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, body, created_at, user_id, profiles(username, display_name, profile_photo)")
    .eq("design_id", designId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addComment(designId, body) {
  const { data, error } = await supabase
    .from("post_comments")
    .insert({ design_id: designId, body })
    .select("id, body, created_at, user_id")
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(commentId) {
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId)
  if (error) throw error
}

// ----- shares -----

export async function recordShare(designId) {
  const { error } = await supabase.from("shares").insert({ design_id: designId })
  if (error) throw error
}
