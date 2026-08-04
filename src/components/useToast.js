import { useCallback, useEffect, useRef, useState } from "react"

// Minimal toast state + the node to render. Pages call showToast("…") and
// render `{toast && <div className="px-toast">{toast}</div>}`.
export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return { toast, showToast }
}
