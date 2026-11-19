import { PALETTE } from "../constants.js"
import { hexToRgb, nearestColor, rgbToHex } from "./palette.js"

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

const clamp = (n) => Math.max(0, Math.min(255, n))

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the image"))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Could not decode the image"))
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function photoSource(img, size) {
  const sw = img.naturalWidth || img.width
  const sh = img.naturalHeight || img.height
  let width = sw
  let height = sh
  const limit = Math.max(size * 2, 2048)
  if (Math.max(sw, sh) > limit) {
    const factor = limit / Math.max(sw, sh)
    width = Math.max(1, Math.round(sw * factor))
    height = Math.max(1, Math.round(sh * factor))
  }
  let canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, width, height)
  while (canvas.width > size * 2 || canvas.height > size * 2) {
    const next = document.createElement("canvas")
    next.width = Math.max(1, Math.ceil(canvas.width / 2))
    next.height = Math.max(1, Math.ceil(canvas.height / 2))
    const nextCtx = next.getContext("2d")
    nextCtx.imageSmoothingEnabled = true
    nextCtx.imageSmoothingQuality = "high"
    nextCtx.drawImage(canvas, 0, 0, next.width, next.height)
    canvas = next
  }
  return canvas
}

function sourceToCells(img, size, mode, fit, alphaThreshold) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  const source = mode === "photo" ? photoSource(img, size) : img
  const width = source.naturalWidth || source.width
  const height = source.naturalHeight || source.height
  const scale = (fit === "cover" ? Math.max : Math.min)(size / width, size / height)
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = mode === "photo"
  if (mode === "photo") ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, (size - width * scale) / 2, (size - height * scale) / 2, width * scale, height * scale)

  const pixels = ctx.getImageData(0, 0, size, size).data
  const cells = []
  for (let y = 0; y < size; y++) {
    const row = []
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      row.push(pixels[i + 3] < alphaThreshold ? null : [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]])
    }
    cells.push(row)
  }
  return cells
}

function makeBox(items) {
  const min = [255, 255, 255]
  const max = [0, 0, 0]
  let total = 0
  for (const item of items) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], item.rgb[i])
      max[i] = Math.max(max[i], item.rgb[i])
    }
    total += item.weight
  }
  const ranges = max.map((value, i) => value - min[i])
  const span = Math.max(...ranges)
  return { items, total, span, channel: ranges.indexOf(span), score: span * Math.sqrt(total) }
}

export function extractPalette(cells, limit = 16) {
  const maximum = Math.max(2, Math.min(64, Math.round(limit)))
  const counts = new Map()
  for (const row of cells) {
    for (const cell of row) {
      if (!cell) continue
      const color = rgbToHex({ r: cell[0], g: cell[1], b: cell[2] })
      counts.set(color, (counts.get(color) || 0) + 1)
    }
  }
  if (counts.size <= maximum) {
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex)
  }

  const bins = new Map()
  for (const [hex, count] of counts) {
    const { r, g, b } = hexToRgb(hex)
    const key = [r >> 3, g >> 3, b >> 3].join(",")
    const item = bins.get(key) || { rgb: [0, 0, 0], weight: 0 }
    item.rgb[0] += r * count
    item.rgb[1] += g * count
    item.rgb[2] += b * count
    item.weight += count
    bins.set(key, item)
  }

  const items = [...bins.values()].map((item) => ({
    rgb: item.rgb.map((value) => value / item.weight),
    weight: item.weight,
  }))
  const boxes = [makeBox(items)]
  while (boxes.length < maximum) {
    let index = -1
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].items.length < 2 || boxes[i].span === 0) continue
      if (index < 0 || boxes[i].score > boxes[index].score) index = i
    }
    if (index < 0) break
    const chosen = boxes[index]
    const ordered = [...chosen.items].sort((a, b) => a.rgb[chosen.channel] - b.rgb[chosen.channel])
    let total = 0
    let split = 1
    for (let i = 0; i < ordered.length - 1; i++) {
      total += ordered[i].weight
      split = i + 1
      if (total >= chosen.total / 2) break
    }
    boxes.splice(index, 1, makeBox(ordered.slice(0, split)), makeBox(ordered.slice(split)))
  }

  const colors = boxes.map((box) => {
    const rgb = [0, 0, 0]
    for (const item of box.items) {
      for (let i = 0; i < 3; i++) rgb[i] += item.rgb[i] * item.weight
    }
    return {
      hex: rgbToHex({ r: rgb[0] / box.total, g: rgb[1] / box.total, b: rgb[2] / box.total }),
      weight: box.total,
    }
  })
  return [...new Set(colors.sort((a, b) => b.weight - a.weight).map((item) => item.hex))]
}

function diffuse(cells, y, x, error) {
  const size = cells.length
  for (const [dy, dx, weight] of [[0, 1, 7 / 16], [1, -1, 3 / 16], [1, 0, 5 / 16], [1, 1, 1 / 16]]) {
    const ny = y + dy
    const nx = x + dx
    if (ny < 0 || nx < 0 || ny >= size || nx >= size || !cells[ny][nx]) continue
    for (let i = 0; i < 3; i++) cells[ny][nx][i] += error[i] * weight
  }
}

export function convertToGrid({
  img,
  size,
  mode = "pixel",
  fit = "contain",
  snap = true,
  paletteMode = "auto",
  colors = 16,
  palette = PALETTE,
  dither = "none",
  alphaThreshold = 128,
}) {
  const gridSize = Math.max(4, Math.min(100, Math.round(size)))
  const cells = sourceToCells(img, gridSize, mode, fit, alphaThreshold)
  const chosen = snap ? (paletteMode === "auto" ? extractPalette(cells, colors) : palette) : []
  const work = cells.map((row) => row.map((cell) => cell && [...cell]))
  const grid = []
  let filled = 0
  for (let y = 0; y < gridSize; y++) {
    const row = []
    for (let x = 0; x < gridSize; x++) {
      const cell = work[y][x]
      if (!cell) {
        row.push(null)
        continue
      }
      let red = clamp(cell[0])
      let green = clamp(cell[1])
      let blue = clamp(cell[2])
      if (snap && dither === "bayer") {
        const offset = ((BAYER[y % 4][x % 4] + 0.5) / 16 - 0.5) * 64
        red = clamp(red + offset)
        green = clamp(green + offset)
        blue = clamp(blue + offset)
      }
      let hex
      if (snap && chosen.length) {
        hex = nearestColor({ r: red, g: green, b: blue }, chosen)
        if (dither === "floyd") {
          const rgb = hexToRgb(hex)
          diffuse(work, y, x, [red - rgb.r, green - rgb.g, blue - rgb.b])
        }
      } else {
        hex = rgbToHex({ r: red, g: green, b: blue })
      }
      row.push(hex)
      filled++
    }
    grid.push(row)
  }
  return { grid, filled, palette: chosen }
}

export function getGridColorKey(grid, maximum = 64) {
  const counts = new Map()
  for (const row of grid) {
    for (const hex of row) {
      if (hex) counts.set(hex, (counts.get(hex) || 0) + 1)
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return {
    total: sorted.length,
    items: sorted.slice(0, maximum).map(([hex, count], index) => ({ hex, count, code: index + 1 })),
  }
}

export function renderGridToCanvas(canvas, grid) {
  if (!grid?.length || !canvas) return
  const ctx = canvas.getContext("2d")
  const size = grid.length
  const width = canvas.width
  const height = canvas.height
  ctx.clearRect(0, 0, width, height)
  for (let y = 0; y < size; y++) {
    const y0 = Math.round(y * height / size)
    const y1 = Math.round((y + 1) * height / size)
    for (let x = 0; x < size; x++) {
      if (!grid[y][x]) continue
      const x0 = Math.round(x * width / size)
      const x1 = Math.round((x + 1) * width / size)
      ctx.fillStyle = grid[y][x]
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
    }
  }
}

export function renderTraceToCanvas(canvas, grid, { cellSize = 8, showGrid = true, showCodes = false, colorKey = [], axis = 32 } = {}) {
  if (!grid?.length || !canvas) return
  const size = grid.length
  const side = axis + size * cellSize
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#f0edf7"
  ctx.fillRect(0, 0, side, side)
  ctx.fillStyle = "#ddd4ef"
  ctx.fillRect(0, 0, axis, axis)
  const codes = new Map(colorKey.map((item) => [item.hex, item.code]))
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const posX = axis + x * cellSize
      const posY = axis + y * cellSize
      const hex = grid[y][x]
      ctx.fillStyle = hex || ((x + y) % 2 === 0 ? "#fff" : "#e9e4ed")
      ctx.fillRect(posX, posY, cellSize, cellSize)
      if (showCodes && cellSize >= 17 && codes.has(hex)) {
        const { r, g, b } = hexToRgb(hex)
        ctx.fillStyle = 0.2126 * r + 0.7152 * g + 0.0722 * b > 145 ? "#211a2c" : "#fff"
        ctx.font = "bold " + Math.min(11, cellSize - 6) + "px monospace"
        ctx.fillText(String(codes.get(hex)), posX + cellSize / 2, posY + cellSize / 2)
      }
    }
  }
  if (showGrid) {
    for (let n = 0; n <= size; n++) {
      const at = axis + n * cellSize + 0.5
      const major = n % 10 === 0 || n === size
      ctx.beginPath()
      ctx.lineWidth = major ? 1 : 0.5
      ctx.strokeStyle = major ? "rgba(37,28,54,.65)" : "rgba(37,28,54,.20)"
      ctx.moveTo(at, axis)
      ctx.lineTo(at, side)
      ctx.moveTo(axis, at)
      ctx.lineTo(side, at)
      ctx.stroke()
    }
  }
  ctx.fillStyle = "#4a3b5c"
  ctx.font = "10px monospace"
  for (let i = 0; i < size; i += 10) {
    ctx.fillText(String(i + 1), axis + (i + 0.5) * cellSize, axis / 2)
    ctx.fillText(String(i + 1), axis / 2, axis + (i + 0.5) * cellSize)
  }
}
