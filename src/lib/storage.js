// localStorage persistence for the workspace (crash recovery) and the design library

import { WORKSPACE_KEY, DESIGNS_KEY, CUSTOM_COLORS_KEY } from "../constants.js"

export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY)
    if (!raw) return null
    const { grid, size, extrude } = JSON.parse(raw)
    if (Array.isArray(grid) && grid.length === size && size >= 5) {
      return { grid, size, extrude: typeof extrude === "number" ? extrude : 2 }
    }
  } catch {
    // corrupted state — ignore
  }
  return null
}

export function saveWorkspace({ grid, size, extrude }) {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ grid, size, extrude }))
  } catch {
    // storage may be unavailable
  }
}

export function clearWorkspace() {
  try {
    localStorage.removeItem(WORKSPACE_KEY)
  } catch {
    // ignore
  }
}

export function loadDesigns() {
  try {
    const raw = localStorage.getItem(DESIGNS_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function persistDesigns(list) {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(list))
  } catch {
    // storage may be unavailable
  }
}

// Next available "Design #n" name so saves don't collide
export function nextDesignName(list) {
  let n = list.length + 1
  const names = new Set(list.map((d) => d.name))
  while (names.has(`Design #${n}`)) n += 1
  return `Design #${n}`
}

// Download every design as a single JSON file
export function downloadDesigns(list) {
  const blob = new Blob(
    [JSON.stringify({ app: "pixeldraw3d", version: 1, exportedAt: new Date().toISOString(), designs: list }, null, 2)],
    { type: "application/json" },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "pixeldraw3d-designs.json"
  a.click()
  URL.revokeObjectURL(url)
}

// Custom colors added via the color maker
export function loadCustomColors() {
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.filter((c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) : []
  } catch {
    return []
  }
}

export function persistCustomColors(list) {
  try {
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

// Parse an exported JSON file and merge into the current library (de-dupe by id)
export function parseDesignsFile(text, existing) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { list: existing, added: 0 }
  }
  const incoming = Array.isArray(parsed) ? parsed : parsed?.designs
  if (!Array.isArray(incoming)) return { list: existing, added: 0 }

  const byId = new Map(existing.map((d) => [d.id, d]))
  let added = 0
  for (const d of incoming) {
    if (!d || !Array.isArray(d.grid) || typeof d.size !== "number") continue
    if (!byId.has(d.id)) {
      byId.set(d.id, { ...d, id: String(d.id) })
      added += 1
    }
  }
  return { list: [...byId.values()], added }
}
