// Shared constants for pixeldraw3d

export const DEFAULT_SIZE = 10
export const SIZE_OPTIONS = [10, 20, 30, 40, 50]
export const MAX_HISTORY = 40

export const WORKSPACE_KEY = "pixeldraw3d.workspace"
export const DESIGNS_KEY = "pixeldraw3d.designs"
export const CUSTOM_COLORS_KEY = "pixeldraw3d.customColors"

// Broader palette used by the editor swatches and the image→pixel snap:
// neutrals + classic paint colors + the pastel theme colors
export const PALETTE = [
  // neutrals
  "#000000",
  "#3f3f46",
  "#808080",
  "#c7c7c7",
  "#ffffff",
  // classic paint colors
  "#800000",
  "#ff0000",
  "#7f3300",
  "#ff7f00",
  "#7f7f00",
  "#ffff00",
  "#007f00",
  "#00ff00",
  "#007f7f",
  "#00ffff",
  "#00007f",
  "#0000ff",
  "#7f007f",
  "#ff00ff",
  // pastels (theme identity)
  "#f9a8d4",
  "#f472b6",
  "#c4b5fd",
  "#a78bfa",
  "#93c5fd",
  "#60a5fa",
  "#6ee7b7",
  "#34d399",
  "#fdba74",
  "#fb923c",
  "#fde68a",
  "#facc15",
]

// Standard 3×3 Rubik's cube colors — used when "Cube mode" is on so the
// result only ever uses the 6 sticker colors
export const RUBIKS_PALETTE = [
  "#ffffff", // white
  "#ffd500", // yellow
  "#c41e3a", // red
  "#ff5800", // orange
  "#0051ba", // blue
  "#009e60", // green
]

// Sample designs — X marks a filled pixel (ported from the portfolio builder)
export const PRESETS = [
  {
    name: "H",
    emoji: "🅗",
    color: "#93c5fd",
    rows: [
      "..........",
      "..X....X..",
      "..X....X..",
      "..X....X..",
      "..XXXXXX..",
      "..X....X..",
      "..X....X..",
      "..X....X..",
      "..........",
      "..........",
    ],
  },
  {
    name: "Smiley",
    emoji: "😄",
    color: "#fde68a",
    rows: [
      "...XXXX...",
      "..x....x..",
      ".X......X.",
      "X.XX..XX.X",
      "X........X",
      "X........X",
      "X..XXXX..X",
      ".X......X.",
      "..XX..XX..",
      "...XXXX...",
    ],
  },
  {
    name: "Heart",
    emoji: "❤️",
    color: "#f9a8d4",
    rows: [
      ".XX....XX.",
      "XXXX..XXXX",
      "XXXXXXXXXX",
      "XXXXXXXXXX",
      ".XXXXXXXX.",
      "..XXXXXX..",
      "...XXXX...",
      "....XX....",
      "..........",
      "..........",
    ],
  },
  {
    name: "Diamond",
    emoji: "💠",
    color: "#c4b5fd",
    rows: [
      "....XX....",
      "...XXXX...",
      "..XXXXXX..",
      ".XXXXXXXX.",
      "XXXXXXXXXX",
      ".XXXXXXXX.",
      "..XXXXXX..",
      "...XXXX...",
      "....XX....",
      "..........",
    ],
  },
]

export const DEFAULT_PRESET = PRESETS.find((p) => p.name === "Heart")
