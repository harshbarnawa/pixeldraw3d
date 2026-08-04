// ============================================================
// PixelDraw3D · cloud designs data access
//
// Reads/writes the public.designs + public.design_versions tables for
// the signed-in user. RLS keeps everything scoped to the owner, so no
// user_id is sent from the client. DB rows are snake_case; app design
// objects are camelCase and match the local-storage design shape exactly
// (so thumbnails, loading and the editor work identically either way).
// ============================================================

import { supabase } from "./supabase.js"

const DESIGN_FIELDS =
  "id, user_id, name, grid, size, extrude, random_lift, is_public, created_at, updated_at"

export function mapCloudDesign(row) {
  return {
    id: row.id,
    name: row.name,
    grid: row.grid ?? [],
    size: row.size,
    extrude: row.extrude,
    randomLift: row.random_lift,
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// The subset of design fields persisted to the DB.
function toRow(design, user_id) {
  return {
    id: design.id,
    user_id,
    name: design.name,
    grid: design.grid,
    size: design.size,
    extrude: design.extrude,
    random_lift: design.randomLift,
    updated_at: new Date().toISOString(),
  }
}

// RLS requires the row to carry the owner's id; read it from the live session.
async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user?.id ?? null
  if (!id) throw new Error("not signed in")
  return id
}

export async function fetchCloudDesigns() {
  const { data, error } = await supabase
    .from("designs")
    .select(DESIGN_FIELDS)
    .order("updated_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapCloudDesign)
}

export async function insertCloudDesign(design) {
  const user_id = await currentUserId()
  const { error } = await supabase.from("designs").insert(toRow(design, user_id))
  if (error) throw error
}

export async function upsertCloudDesign(design) {
  const user_id = await currentUserId()
  const { error } = await supabase.from("designs").upsert(toRow(design, user_id))
  if (error) throw error
}

export async function renameCloudDesign(id, name) {
  const { error } = await supabase
    .from("designs")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function deleteCloudDesign(id) {
  const { error } = await supabase.from("designs").delete().eq("id", id)
  if (error) throw error
}

// Toggle a design between public (visible on the community feed) and private.
// The RLS policy restricts this to the row's owner; community reads only ever
// see rows where is_public = true.
export async function setDesignPublic(id, isPublic) {
  const { error } = await supabase
    .from("designs")
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

// ----- version history -----

export async function fetchCloudVersions(designId) {
  const { data, error } = await supabase
    .from("design_versions")
    .select("id, name, grid, size, extrude, random_lift, saved_at")
    .eq("design_id", designId)
    .order("saved_at", { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    grid: v.grid ?? [],
    size: v.size,
    extrude: v.extrude,
    randomLift: v.random_lift,
    savedAt: v.saved_at,
  }))
}

export async function addCloudVersion(design, savedAt = new Date().toISOString()) {
  const { error } = await supabase.from("design_versions").insert({
    design_id: design.id,
    name: design.name,
    grid: design.grid,
    size: design.size,
    extrude: design.extrude,
    random_lift: design.randomLift,
    saved_at: savedAt,
  })
  if (error) throw error
}

// Roll a design back to a stored version snapshot.
export async function restoreCloudVersion(designId, version) {
  const { error } = await supabase
    .from("designs")
    .update({
      name: version.name,
      grid: version.grid,
      size: version.size,
      extrude: version.extrude,
      random_lift: version.randomLift,
      updated_at: new Date().toISOString(),
    })
    .eq("id", designId)
  if (error) throw error
}
