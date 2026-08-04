// Export everything a user owns as a single downloadable JSON file.

import { supabase } from "./supabase.js"
import { downloadBlob } from "./voxelExport.js"

export async function exportUserData(userId) {
  if (!supabase) throw new Error("supabase is not configured")

  const [profRes, designsRes, payRes, invRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("designs").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("user_id", userId).order("issued_at", { ascending: false }),
  ])

  const data = {
    exportedAt: new Date().toISOString(),
    profile: profRes.data ?? null,
    designs: designsRes.data ?? [],
    payments: payRes.data ?? [],
    invoices: invRes.data ?? [],
  }

  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    `pixeldraw3d-data-${userId.slice(0, 8)}.json`,
  )
  return true
}
