// Image → pixel converter: downscale an image to a grid of cells,
// optionally snap each cell to a palette and apply dithering.

import { PALETTE } from "../constants.js"
import { hexToRgb, nearestColor, rgbToHex } from "./palette.js"

// 2×2 Bayer threshold matrix, normalized to [-0.5, +0.5]
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

function bayerValue(r, c) {
  return (BAYER[r % 4][c % 4] + 0.5) / 16 - 0.5
}

function clamp255(v) {
  return Math.max(0, Math.min(255, v))
}

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Could not decode image"))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}

// High-quality stepwise downscale so cell averages aren't aliased
function stepDown(img, targetSize) {
  let canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  let ctx = canvas.getContext("2d")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0)

  let w = canvas.width
  let h = canvas.height
  while (w > targetSize * 2 || h > targetSize * 2) {
    w = Math.max(targetSize, Math.floor(w / 2))
    h = Math.max(targetSize, Math.floor(h / 2))
    const next = document.createElement("canvas")
    next.width = w
    next.height = h
    const nctx = next.getContext("2d")
    nctx.imageSmoothingEnabled = true
    nctx.imageSmoothingQuality = "high"
    nctx.drawImage(canvas, 0, 0, w, h)
    canvas = next
  }
  return canvas
}

// Distribute quantization error to unvisited neighbors (Floyd–Steinberg)
function diffuse(cells, r, c, er, eg, eb, size, alphaThreshold) {
  const neigh = [
    [0, 1, 7 / 16],
    [1, -1, 3 / 16],
    [1, 0, 5 / 16],
    [1, 1, 1 / 16],
  ]
  for (const [dr, dc, w] of neigh) {
    const nr = r + dr
    const nc = c + dc
    if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
    const t = cells[nr][nc]
    if (!t || t[3] < alphaThreshold) continue
    t[0] += er * w
    t[1] += eg * w
    t[2] += eb * w
  }
}

// Options:
//   size            target grid N (e.g. 20 → 20×20)
//   snap            snap colors to the pastel palette
//   palette         palette to snap against (used when snap is on)
//   dither          "none" | "bayer" | "floyd"
//   alphaThreshold  pixels with alpha below this become empty (0-255)
export function convertToGrid({ img, size, snap = true, palette = PALETTE, dither = "none", alphaThreshold = 128 }) {
  const target = document.createElement("canvas")
  target.width = size
  target.height = size
  const tctx = target.getContext("2d", { willReadFrequently: true })
  const mid = stepDown(img, size)
  // Cover-fit: scale the image so it always fills the whole square grid,
  // cropping the overflow evenly. Every result is full-bleed — no weird
  // letterbox margins, and the picture's on-grid size stays fixed.
  const mw = mid.width
  const mh = mid.height
  const scale = Math.max(size / mw, size / mh)
  const dw = mw * scale
  const dh = mh * scale
  const dx = (size - dw) / 2
  const dy = (size - dh) / 2
  tctx.imageSmoothingEnabled = true
  tctx.imageSmoothingQuality = "high"
  tctx.drawImage(mid, dx, dy, dw, dh)

  const data = tctx.getImageData(0, 0, size, size).data
  const cells = []
  for (let r = 0; r < size; r++) {
    const row = []
    for (let c = 0; c < size; c++) {
      const i = (r * size + c) * 4
      if (data[i + 3] < alphaThreshold) {
        row.push(null)
      } else {
        row.push([data[i], data[i + 1], data[i + 2], data[i + 3]])
      }
    }
    cells.push(row)
  }

  const grid = []
  let filled = 0
  for (let r = 0; r < size; r++) {
    const grow = []
    for (let c = 0; c < size; c++) {
      const cell = cells[r][c]
      if (!cell) {
        grow.push(null)
        continue
      }
      let [cr, cg, cb] = cell
      if (snap) {
        if (dither === "bayer") {
          const off = bayerValue(r, c) * 64
          cr = clamp255(cr + off)
          cg = clamp255(cg + off)
          cb = clamp255(cb + off)
        }
        const hex = nearestColor({ r: cr, g: cg, b: cb }, palette)
        if (dither === "floyd") {
          const s = hexToRgb(hex)
          diffuse(cells, r, c, cr - s.r, cg - s.g, cb - s.b, size, alphaThreshold)
        }
        grow.push(hex)
      } else {
        grow.push(rgbToHex({ r: cr, g: cg, b: cb }))
      }
      filled += 1
    }
    grid.push(grow)
  }

  return { grid, filled }
}

// Draw a grid onto a square canvas (used for live previews)
export function renderGridToCanvas(canvas, grid) {
  const size = grid.length
  if (!size) return
  const ctx = canvas.getContext("2d")
  const cw = canvas.width
  ctx.clearRect(0, 0, cw, cw)
  // Exact cell geometry — no overlap, no clipped overflow — so the preview
  // stays crisp and the same fixed size for every grid resolution.
  const cellPx = cw / size
  for (let r = 0; r < size; r++) {
    const y0 = Math.round(r * cellPx)
    const y1 = Math.round((r + 1) * cellPx)
    for (let c = 0; c < size; c++) {
      const hex = grid[r][c]
      if (!hex) continue
      ctx.fillStyle = hex
      ctx.fillRect(Math.round(c * cellPx), y0, Math.round((c + 1) * cellPx) - Math.round(c * cellPx), y1 - y0)
    }
  }
}
