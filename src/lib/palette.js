// Color helpers: hex parsing + nearest-palette-color matching

export function hexToRgb(hex) {
  let h = hex.replace("#", "")
  if (h.length === 3) {
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("")
  }
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
  return `#${c(r)}${c(g)}${c(b)}`
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

// Euclidean distance in RGB with slightly green-heavy weighting (matches human-ish perception)
export function nearestColor({ r, g, b }, palette) {
  let best = null
  let bestDist = Infinity
  for (const hex of palette) {
    const p = hexToRgb(hex)
    const dr = r - p.r
    const dg = g - p.g
    const db = b - p.b
    const dist = dr * dr + dg * dg * 1.2 + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = hex
    }
  }
  return best
}

export function addOffset({ r, g, b }, delta) {
  return { r: clamp(r + delta), g: clamp(g + delta), b: clamp(b + delta) }
}

// HSV → RGB. h: 0-360, s: 0-100, v: 0-100
export function hsvToRgb(h, s, v) {
  s /= 100
  v /= 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return { r: clamp((r + m) * 255), g: clamp((g + m) * 255), b: clamp((b + m) * 255) }
}

// RGB (0-255) → HSV
export function rgbToHsv(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const sVal = max === 0 ? 0 : d / max
  return { h, s: sVal * 100, v: max * 100 }
}

// Rich "cube mode" palette covering the whole color gamut —
// grays + skin/warm tones + a spread of hues across several lightness levels.
// Makes image→pixel output look like a vivid cube-art sketch.
export function buildGamutPalette() {
  const grays = ["#000000", "#2a2a2e", "#54545c", "#8a8a92", "#c0c0c6", "#e7e7ea", "#ffffff"]
  const warm = ["#ffe2c4", "#ffd0a0", "#e9ab7d", "#cb8a5c", "#a86d4a", "#7d4f31", "#4a2c18"]
  const hues = [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350]
  const tones = [
    [95, 90], // vivid bright
    [78, 62], // mid
    [62, 35], // dark
    [45, 95], // pastel
  ]
  const colors = [...grays, ...warm]
  for (const h of hues) {
    for (const [s, v] of tones) {
      colors.push(rgbToHex(hsvToRgb(h, s, v)))
    }
  }
  return [...new Set(colors)]
}
