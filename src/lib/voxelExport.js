// Export helpers for the voxel model — OBJ (with vertex colors) and GLB
// (via three's GLTFExporter), plus a turntable-animation GLB for PRO.
//
// Both rebuild the exact geometry the viewport renders: one unit cube per grid
// cell, extruded by the height slider, shifted up by the deterministic random
// lift. See VoxelViewport for the on-screen equivalent.

import * as THREE from "three"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

// Deterministic per-cell PRNG — must match VoxelViewport.randomUnit so exports
// line up with what's on screen for a given random-lift value.
function randomUnit(r, c, salt) {
  let h = (r * 374761393 + c * 668265263 + salt * 2654435761) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// The cubes the 3D view shows, in the same positions and colors.
export function computeInstances({ grid, size, extrude, randomLift }) {
  const list = []
  const offset = (size - 1) / 2
  for (let r = 0; r < size; r++) {
    const row = grid[r]
    if (!row) continue
    for (let c = 0; c < size; c++) {
      const cell = row[c]
      if (!cell) continue
      const lift = randomLift > 0 ? Math.floor(randomUnit(r, c, randomLift) * (randomLift + 1)) : 0
      for (let y = 0; y < extrude; y++) {
        list.push({ x: c - offset, y: y + 0.5 + lift, z: r - offset, color: cell })
      }
    }
  }
  return list
}

export function hexToRgb(hex) {
  const h = String(hex || "#000000").replace("#", "")
  const expanded = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = parseInt(expanded, 16) || 0
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Unit cube corners and outward faces (OBJ is 1-based, so faces are emitted
// relative to each cube's first vertex).
const CUBE_VERTICES = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
]
const CUBE_FACES = [
  [0, 2, 1], [0, 3, 2], // -z
  [4, 5, 6], [4, 6, 7], // +z
  [0, 1, 5], [0, 5, 4], // -y
  [2, 3, 7], [2, 7, 6], // +y
  [1, 2, 6], [1, 6, 5], // +x
  [0, 4, 7], [0, 7, 3], // -x
]

// Wavefront OBJ with per-vertex RGB colors (`v x y z r g b`). Vertex colors are
// read by Blender 3.1+, MeshLab and most modern importers; the faces carry no
// material so colors stay embedded in the geometry.
export function buildOBJ({ grid, size, extrude, randomLift }) {
  const instances = computeInstances({ grid, size, extrude, randomLift })
  const lines = [
    "# PixelDraw3D voxel model",
    `# ${instances.length} cubes · ${size}×${size} grid`,
  ]
  let v = 1
  for (const inst of instances) {
    const { r, g, b } = hexToRgb(inst.color)
    for (const [cx, cy, cz] of CUBE_VERTICES) {
      lines.push(
        `v ${(inst.x + cx).toFixed(3)} ${(inst.y + cy).toFixed(3)} ${(inst.z + cz).toFixed(3)} ` +
          `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`,
      )
    }
    for (const face of CUBE_FACES) {
      lines.push(`f ${v + face[0]} ${v + face[1]} ${v + face[2]}`)
    }
    v += 8
  }
  return lines.join("\n") + "\n"
}

// One merged, vertex-colored BoxGeometry covering every cube — compact for the
// GLB and fast enough to export even a full 100×100 slate.
function mergedVoxelGeometry(instances) {
  const box = new THREE.BoxGeometry(1, 1, 1)
  const parts = []
  const color = new THREE.Color()
  for (const inst of instances) {
    const g = box.clone()
    g.translate(inst.x, inst.y, inst.z)
    color.set(inst.color)
    const n = g.attributes.position.count
    const colors = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    parts.push(g)
  }
  if (parts.length === 0) return new THREE.BufferGeometry()
  return mergeGeometries(parts)
}

// Binary GLB via three's GLTFExporter. Returns an ArrayBuffer.
export async function buildGLB({ grid, size, extrude, randomLift }) {
  const instances = computeInstances({ grid, size, extrude, randomLift })
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(mergedVoxelGeometry(instances), new THREE.MeshStandardMaterial({ vertexColors: true })))
  return parseScene(scene)
}

// GLB with a looping 360° turntable animation baked in (PRO animation export).
export async function buildTurntableGLB({ grid, size, extrude, randomLift, seconds = 4 }) {
  const instances = computeInstances({ grid, size, extrude, randomLift })
  const group = new THREE.Group()
  group.add(new THREE.Mesh(mergedVoxelGeometry(instances), new THREE.MeshStandardMaterial({ vertexColors: true })))
  const scene = new THREE.Scene()
  scene.add(group)

  const track = new THREE.VectorKeyframeTrack(".rotation[y]", [0, seconds], [0, Math.PI * 2])
  const clip = new THREE.AnimationClip("turntable", seconds, [track])
  group.animations = [clip]
  return parseScene(scene)
}

function parseScene(scene) {
  const exporter = new GLTFExporter()
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(result),
      (err) => reject(err),
      { binary: true },
    )
  })
}
