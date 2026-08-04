import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "./AuthContext.jsx"
import { supabase } from "../lib/supabase.js"
import { createId, loadDesigns, nextDesignName, persistDesigns } from "../lib/storage.js"
import { getPlanQuota } from "../lib/plans.js"
import {
  addCloudVersion,
  deleteCloudDesign,
  fetchCloudDesigns,
  fetchCloudVersions,
  insertCloudDesign,
  renameCloudDesign,
  restoreCloudVersion,
  upsertCloudDesign,
} from "../lib/cloudDesigns.js"

// Single source of truth for the user's design library.
//   guest   → designs live in localStorage (current behavior, unlimited)
//   authed  → designs live in Supabase, quota enforced via getPlanQuota
// Every mutation returns { ok, reason?, design? } so callers can show an
// Upgrade Dialog when reason === "quota".
const DesignsContext = createContext(null)

const sortRecent = (list) =>
  [...list].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))

export function DesignsProvider({ children }) {
  const { user, profile, refreshProfile } = useAuth()
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCloud, setIsCloud] = useState(false)

  // Refs mirror current values so async callbacks never read stale state.
  const designsRef = useRef([])
  const modeRef = useRef("local")
  const userRef = useRef(user)
  const profileRef = useRef(profile)
  const lastVersionSig = useRef({}) // { designId: JSON(grid) } → skip duplicate snapshots
  userRef.current = user
  profileRef.current = profile

  // Reload the library whenever the signed-in user changes.
  useEffect(() => {
    let alive = true
    setLoading(true)
    designsRef.current = []
    lastVersionSig.current = {}

    if (user) {
      modeRef.current = "cloud"
      setIsCloud(true)
      fetchCloudDesigns()
        .then((list) => {
          if (!alive) return
          designsRef.current = sortRecent(list)
          setDesigns(designsRef.current)
        })
        .catch((e) => {
          console.error("cloud designs failed to load:", e.message)
          if (alive) {
            designsRef.current = []
            setDesigns([])
          }
        })
        .finally(() => alive && setLoading(false))
    } else {
      modeRef.current = "local"
      setIsCloud(false)
      const list = loadDesigns()
      designsRef.current = sortRecent(list)
      setDesigns(designsRef.current)
      setLoading(false)
    }

    return () => {
      alive = false
    }
  }, [user?.id])

  // Keep profile.cloud_designs_used in sync (best effort; used = designs.length
  // is the source of truth for the UI).
  const bumpProfileCounter = useCallback(
    async (count) => {
      try {
        await supabase.from("profiles").update({ cloud_designs_used: count }).eq("id", userRef.current?.id)
        refreshProfile()
      } catch (e) {
        console.error("profile counter update failed:", e.message)
      }
    },
    [refreshProfile],
  )

  const quotaLimit = useCallback(() => getPlanQuota(profileRef.current, "cloudDesigns"), [])

  const createDesign = useCallback(
    async ({ grid, size, extrude, randomLift, name } = {}) => {
      if (modeRef.current === "cloud" && designsRef.current.length >= quotaLimit()) {
        return { ok: false, reason: "quota" }
      }
      const now = new Date().toISOString()
      const design = {
        id: createId(),
        name: name?.trim() || nextDesignName(designsRef.current),
        grid: grid ?? [],
        size: size ?? 10,
        extrude: extrude ?? 2,
        randomLift: randomLift ?? 0,
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      }
      designsRef.current = sortRecent([design, ...designsRef.current])
      setDesigns(designsRef.current)

      if (modeRef.current === "local") {
        persistDesigns(designsRef.current)
      } else {
        try {
          await insertCloudDesign(design)
          await addCloudVersion(design, now)
          bumpProfileCounter(designsRef.current.length)
        } catch (e) {
          console.error("cloud save failed:", e.message)
          return { ok: false, reason: "error" }
        }
      }
      return { ok: true, design }
    },
    [bumpProfileCounter, quotaLimit],
  )

  const updateDesign = useCallback(
    async (id, patch, { createVersion = false } = {}) => {
      const current = designsRef.current.find((d) => d.id === id)
      if (!current) return { ok: false, reason: "not-found" }
      const updated = { ...current, ...patch, updatedAt: new Date().toISOString() }
      designsRef.current = sortRecent([updated, ...designsRef.current.filter((d) => d.id !== id)])
      setDesigns(designsRef.current)

      if (modeRef.current === "local") {
        persistDesigns(designsRef.current)
      } else {
        try {
          await upsertCloudDesign(updated)
          if (createVersion) await addCloudVersionSnapshot(updated)
        } catch (e) {
          console.error("cloud update failed:", e.message)
          return { ok: false, reason: "error" }
        }
      }
      return { ok: true, design: updated }
    },
    [],
  )

  const renameDesign = useCallback(
    async (id, name) => {
      const trimmed = name.trim()
      if (!trimmed) return { ok: false, reason: "name" }
      const current = designsRef.current.find((d) => d.id === id)
      if (!current) return { ok: false, reason: "not-found" }
      if (current.name === trimmed) return { ok: true, design: current }

      const updated = { ...current, name: trimmed, updatedAt: new Date().toISOString() }
      designsRef.current = sortRecent([updated, ...designsRef.current.filter((d) => d.id !== id)])
      setDesigns(designsRef.current)

      if (modeRef.current === "local") persistDesigns(designsRef.current)
      else {
        try {
          await renameCloudDesign(id, trimmed)
        } catch (e) {
          console.error("cloud rename failed:", e.message)
          return { ok: false, reason: "error" }
        }
      }
      return { ok: true, design: updated }
    },
    [],
  )

  const duplicateDesign = useCallback(
    async (id) => {
      const src = designsRef.current.find((d) => d.id === id)
      if (!src) return { ok: false, reason: "not-found" }
      if (modeRef.current === "cloud" && designsRef.current.length >= quotaLimit()) {
        return { ok: false, reason: "quota" }
      }
      const now = new Date().toISOString()
      const dup = { ...src, id: createId(), name: `${src.name} copy`, createdAt: now, updatedAt: now }
      designsRef.current = sortRecent([dup, ...designsRef.current])
      setDesigns(designsRef.current)

      if (modeRef.current === "local") {
        persistDesigns(designsRef.current)
      } else {
        try {
          await insertCloudDesign(dup)
          await addCloudVersion(dup, now)
          bumpProfileCounter(designsRef.current.length)
        } catch (e) {
          console.error("cloud duplicate failed:", e.message)
          return { ok: false, reason: "error" }
        }
      }
      return { ok: true, design: dup }
    },
    [bumpProfileCounter, quotaLimit],
  )

  const deleteDesign = useCallback(
    async (id) => {
      designsRef.current = designsRef.current.filter((d) => d.id !== id)
      setDesigns(designsRef.current)

      if (modeRef.current === "local") {
        persistDesigns(designsRef.current)
      } else {
        try {
          await deleteCloudDesign(id)
          bumpProfileCounter(designsRef.current.length)
        } catch (e) {
          console.error("cloud delete failed:", e.message)
          return { ok: false, reason: "error" }
        }
      }
      return { ok: true }
    },
    [bumpProfileCounter],
  )

  // Import a parsed design file (from DesignLibrary). Local: merge + persist.
  // Cloud: respect the quota, insert one at a time, snapshot each with a version.
  const importDesigns = useCallback(
    async (incoming) => {
      const existing = new Map(designsRef.current.map((d) => [d.id, d]))
      const fresh = []
      for (const d of incoming) {
        if (!d || !Array.isArray(d.grid) || typeof d.size !== "number") continue
        const id = String(d.id)
        if (existing.has(id)) continue
        const design = { ...d, id }
        existing.set(id, design)
        fresh.push(design)
      }
      if (fresh.length === 0) return { ok: true, added: 0 }

      if (modeRef.current === "local") {
        designsRef.current = sortRecent([...existing.values()])
        setDesigns(designsRef.current)
        persistDesigns(designsRef.current)
        return { ok: true, added: fresh.length }
      }

      const limit = quotaLimit()
      let inserted = 0
      let quotaHit = false
      for (const design of fresh) {
        if (designsRef.current.length >= limit) {
          quotaHit = true
          break
        }
        try {
          await insertCloudDesign(design)
          await addCloudVersion(design)
          designsRef.current = sortRecent([design, ...designsRef.current])
          inserted += 1
        } catch (e) {
          console.error("cloud import failed:", e.message)
        }
      }
      setDesigns(designsRef.current)
      bumpProfileCounter(designsRef.current.length)
      return { ok: true, added: inserted, quotaHit }
    },
    [bumpProfileCounter, quotaLimit],
  )

  // ----- version history (cloud only) -----

  const addCloudVersionSnapshot = useCallback(async (design) => {
    const sig = JSON.stringify(design.grid)
    if (lastVersionSig.current[design.id] === sig) return // unchanged → skip
    lastVersionSig.current[design.id] = sig
    await addCloudVersion(design)
  }, [])

  const fetchVersions = useCallback(async (designId) => {
    if (modeRef.current !== "cloud") return []
    try {
      return await fetchCloudVersions(designId)
    } catch (e) {
      console.error("fetch versions failed:", e.message)
      return []
    }
  }, [])

  const restoreVersion = useCallback(async (designId, version) => {
    if (modeRef.current !== "cloud") return { ok: false, reason: "mode" }
    const current = designsRef.current.find((d) => d.id === designId)
    if (!current) return { ok: false, reason: "not-found" }
    try {
      await restoreCloudVersion(designId, version)
      const updated = {
        ...current,
        name: version.name,
        grid: version.grid,
        size: version.size,
        extrude: version.extrude,
        randomLift: version.randomLift,
        updatedAt: new Date().toISOString(),
      }
      designsRef.current = sortRecent([updated, ...designsRef.current.filter((d) => d.id !== designId)])
      setDesigns(designsRef.current)
      return { ok: true, design: updated }
    } catch (e) {
      console.error("restore failed:", e.message)
      return { ok: false, reason: "error" }
    }
  }, [])

  const usage = useMemo(() => {
    if (!isCloud) return null
    return { used: designs.length, limit: getPlanQuota(profile, "cloudDesigns") }
  }, [isCloud, designs.length, profile])

  const canCreateMore = useMemo(() => {
    if (!isCloud) return true
    return designs.length < getPlanQuota(profile, "cloudDesigns")
  }, [isCloud, designs.length, profile])

  const value = useMemo(
    () => ({
      designs,
      loading,
      isCloud,
      usage,
      canCreateMore,
      createDesign,
      updateDesign,
      renameDesign,
      duplicateDesign,
      deleteDesign,
      importDesigns,
      fetchVersions,
      restoreVersion,
    }),
    [designs, loading, isCloud, usage, canCreateMore, createDesign, updateDesign, renameDesign, duplicateDesign, deleteDesign, importDesigns, fetchVersions, restoreVersion],
  )

  return <DesignsContext.Provider value={value}>{children}</DesignsContext.Provider>
}

export function useDesigns() {
  const ctx = useContext(DesignsContext)
  if (!ctx) throw new Error("useDesigns must be used inside <DesignsProvider>")
  return ctx
}
