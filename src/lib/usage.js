// Daily usage counters for count-based quotas (image imports).
//
// Counters live on the profiles row (image_imports_used + image_imports_day).
// A new calendar day resets the counter. Guests have no profile row, so they
// get the FREE baseline with login-gated features turned off — that gate lives
// in hasFeature(), this module only manages the number.

import { supabase } from "./supabase.js"
import { getPlanQuota } from "./plans.js"

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// The effective "used today" count for a profile, plus the plan's limit.
export function imageImportUsage(profile) {
  const limit = getPlanQuota(profile, "imageImportsPerDay")
  const used = profile?.image_imports_used ?? 0
  const usedToday = profile?.image_imports_day === todayKey() ? used : 0
  return {
    used: usedToday,
    limit,
    unlimited: !Number.isFinite(limit),
    remaining: Math.max(0, limit - usedToday),
  }
}

// Record one image import against the daily counter (signed-in users only).
// Returns false when the quota is already spent so the caller can block.
export async function recordImageImport(profile) {
  const usage = imageImportUsage(profile)
  if (usage.unlimited) return true
  if (usage.remaining <= 0) return false
  try {
    await supabase
      .from("profiles")
      .update({ image_imports_used: usage.used + 1, image_imports_day: todayKey() })
      .eq("id", profile.id)
    return true
  } catch (e) {
    console.error("recordImageImport failed:", e.message)
    return false
  }
}
