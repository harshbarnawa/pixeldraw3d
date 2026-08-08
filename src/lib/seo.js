import { useEffect } from "react"

// Sets the document <title> and <meta name="description"> for a page, then
// restores the previous values on unmount. Every content page uses this so
// search engines (and the AdSense review) index each route with its own
// title and blurb instead of the generic one from index.html.
export function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title
    const meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute("content") ?? null

    document.title = title ? `${title} — pixeldraw3d` : "pixeldraw3d — pastel pixel studio"
    if (meta && description) meta.setAttribute("content", description)

    return () => {
      document.title = prevTitle
      if (meta && prevDesc != null) meta.setAttribute("content", prevDesc)
    }
  }, [title, description])
}
