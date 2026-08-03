// Small grid helpers shared by the editor and the app shell

export function emptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

export function cloneGrid(grid) {
  return grid.map((row) => [...row])
}

export function presetToGrid(preset) {
  return preset.rows.map((row) =>
    row.split("").map((ch) => (ch.toLowerCase() === "x" ? preset.color : null)),
  )
}

export function countFilled(grid) {
  return grid.flat().filter(Boolean).length
}
