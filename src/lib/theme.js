// Light/dark theme helpers. The active theme is a `data-theme` attribute on
// <html>; CSS variable overrides in styles.css do the rest.

export const THEME_KEY = "pixeldraw3d-theme"
export const THEMES = ["light", "dark"]

export function getTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return THEMES.includes(t) ? t : "light"
  } catch {
    return "light"
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

export function setTheme(theme) {
  applyTheme(theme)
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore storage errors */
  }
}
