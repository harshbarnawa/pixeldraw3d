import { useEffect, useState } from "react"

// Lists saved snapshots of a cloud design and lets the user roll back to one.
// Props: open, design, onClose, fetchVersions(designId), restoreVersion(designId, version),
//        onRestored(updatedDesign)
export default function VersionHistoryModal({
  open,
  design,
  onClose,
  fetchVersions,
  restoreVersion,
  onRestored,
}) {
  const [versions, setVersions] = useState(null)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!open || !design) return
    let alive = true
    setVersions(null)
    setError("")
    fetchVersions(design.id)
      .then((list) => alive && setVersions(list))
      .catch(() => alive && setError("couldn't load version history"))
    return () => {
      alive = false
    }
  }, [open, design, fetchVersions])

  if (!open || !design) return null

  const fmt = (iso) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

  const handleRestore = async (v) => {
    setBusyId(v.id)
    try {
      const res = await restoreVersion(design.id, v)
      if (res.ok) {
        onRestored?.(res.design)
        onClose()
      } else {
        setError("restore failed — try again")
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="color-backdrop" onClick={onClose}>
      <div className="color-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cd-head">
          <span className="px-panel-title" style={{ margin: 0 }}>
            version history · {design.name}
          </span>
          <button type="button" className="mini-btn" onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>

        {error && (
          <p className="muted" style={{ margin: "0 0 10px" }}>
            {error}
          </p>
        )}

        {!versions ? (
          <p className="muted" style={{ margin: 0 }}>
            loading…
          </p>
        ) : versions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            no saved versions yet — hit “save design” to snapshot one.
          </p>
        ) : (
          <ul className="version-list">
            {versions.map((v, i) => (
              <li key={v.id} className="version-item">
                <div className="version-meta">
                  <span className="px-label">v{versions.length - i}</span>
                  <span className="version-date">saved {fmt(v.savedAt)}</span>
                </div>
                <button
                  type="button"
                  className="px-btn px-btn--sm px-btn--mint"
                  disabled={busyId === v.id}
                  onClick={() => handleRestore(v)}
                >
                  {busyId === v.id ? "restoring…" : "restore"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
