// ============================================================
// PixelDraw3D · plan + permission system
//
// Single source of truth for what each plan can do. UI code must
// NEVER compare `user.currentPlan === "PRO"` directly — always ask
// hasFeature() / getPlanQuota(). Guests have no profile row, so we
// pass `null` as the user and get the FREE baseline with login-gated
// features turned off.
// ============================================================

export const PLAN = Object.freeze({
  FREE: "FREE",
  PLUS: "PLUS",
  PRO: "PRO",
})

export const PLAN_META = Object.freeze({
  [PLAN.FREE]: { id: PLAN.FREE, label: "Free", price: 0, badge: null },
  [PLAN.PLUS]: { id: PLAN.PLUS, label: "PLUS", price: 99, badge: "plus" },
  [PLAN.PRO]: { id: PLAN.PRO, label: "PRO", price: 299, badge: "pro" },
})

// Feature keys. Every premium feature is gated through these.
export const FEATURE = Object.freeze({
  IMAGE_IMPORT: "FEATURE_IMAGE_IMPORT",
  HD_EXPORT: "FEATURE_HD_EXPORT",
  PRIVATE_DESIGNS: "FEATURE_PRIVATE_DESIGNS",
  UNLIMITED_SAVE: "FEATURE_UNLIMITED_SAVE",
  PRIORITY_RENDER: "FEATURE_PRIORITY_RENDER",
  EXPORT_3D: "FEATURE_EXPORT_3D",
  ANIMATION_EXPORT: "FEATURE_ANIMATION_EXPORT",
  AUTOSAVE: "FEATURE_AUTOSAVE",
  UNLIMITED_UNDO: "FEATURE_UNLIMITED_UNDO",
  NO_ADS: "FEATURE_NO_ADS",
  PRIORITY_SUPPORT: "FEATURE_PRIORITY_SUPPORT",
  UNLIMITED_IMAGE_IMPORT: "FEATURE_UNLIMITED_IMAGE_IMPORT",
  OBJ_EXPORT: "FEATURE_OBJ_EXPORT",
  GLB_EXPORT: "FEATURE_GLB_EXPORT",
  EXPERIMENTAL: "FEATURE_EXPERIMENTAL",
})

// Features that require a signed-in account at all (guests: OFF).
const REQUIRES_LOGIN = new Set([
  FEATURE.IMAGE_IMPORT,
  FEATURE.UNLIMITED_SAVE,
  FEATURE.PRIVATE_DESIGNS,
  FEATURE.AUTOSAVE,
  FEATURE.HD_EXPORT,
  FEATURE.PRIORITY_RENDER,
  FEATURE.EXPORT_3D,
  FEATURE.ANIMATION_EXPORT,
  FEATURE.NO_ADS,
  FEATURE.PRIORITY_SUPPORT,
  FEATURE.UNLIMITED_IMAGE_IMPORT,
  FEATURE.OBJ_EXPORT,
  FEATURE.GLB_EXPORT,
  FEATURE.EXPERIMENTAL,
])

const PLUS_FEATURES = new Set([
  FEATURE.UNLIMITED_SAVE,
  FEATURE.AUTOSAVE,
  FEATURE.HD_EXPORT,
  FEATURE.PRIVATE_DESIGNS,
  FEATURE.UNLIMITED_UNDO,
  FEATURE.NO_ADS,
  FEATURE.PRIORITY_SUPPORT,
])

const PRO_FEATURES = new Set([
  ...PLUS_FEATURES,
  FEATURE.UNLIMITED_IMAGE_IMPORT,
  FEATURE.ANIMATION_EXPORT,
  FEATURE.EXPORT_3D,
  FEATURE.OBJ_EXPORT,
  FEATURE.GLB_EXPORT,
  FEATURE.EXPERIMENTAL,
  FEATURE.PRIORITY_RENDER,
])

// image import is available to every logged-in plan (quota differs)
const FREE_FEATURES = new Set([FEATURE.IMAGE_IMPORT])

const FEATURE_MATRIX = {
  [PLAN.FREE]: FREE_FEATURES,
  [PLAN.PLUS]: PLUS_FEATURES,
  [PLAN.PRO]: PRO_FEATURES,
}

// Count-based limits per plan. Infinity = unlimited.
const QUOTAS = {
  cloudDesigns: { [PLAN.FREE]: 5, [PLAN.PLUS]: Infinity, [PLAN.PRO]: Infinity },
  imageImportsPerDay: { [PLAN.FREE]: 2, [PLAN.PLUS]: 10, [PLAN.PRO]: Infinity },
}

// The auth user object is `null` for guests.
export const getUserPlan = (user) => user?.currentPlan ?? PLAN.FREE

export function isFree(user) {
  return getUserPlan(user) === PLAN.FREE
}

export function isPlus(user) {
  return getUserPlan(user) === PLAN.PLUS
}

export function isPro(user) {
  return getUserPlan(user) === PLAN.PRO
}

export function hasFeature(user, feature) {
  if (!user && REQUIRES_LOGIN.has(feature)) return false
  const plan = getUserPlan(user)
  return FEATURE_MATRIX[plan]?.has(feature) ?? false
}

export function getPlanQuota(user, quotaKey) {
  const plan = getUserPlan(user)
  const quota = QUOTAS[quotaKey]
  return quota ? (quota[plan] ?? Infinity) : Infinity
}
