// Avatar upload to the public 'avatars' storage bucket.
// Files are named `<uid>.<ext>` so the storage policy only lets the owner
// write their own; public bucket makes the URL load without auth.

import { supabase } from "./supabase.js"

const BUCKET = "avatars"

export async function uploadAvatar(userId, file) {
  if (!supabase) throw new Error("supabase is not configured")
  if (!file.type.startsWith("image/")) throw new Error("pick an image file")
  if (file.size > 2 * 1024 * 1024) throw new Error("image must be under 2MB")

  const ext = (file.name.split(".").pop() || "png").toLowerCase()
  const path = `${userId}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
