import { useRef } from "react"
import DesignCard from "./DesignCard.jsx"

// Props: designs, usage, onLoad, onRename, onDuplicate, onDelete, onOpenVersions,
//        onExportAll, onImportFile
// `usage` is an optional node (DesignUsage) shown under the header in cloud mode.
export default function DesignLibrary({
  designs,
  usage,
  onLoad,
  onRename,
  onDuplicate,
  onDelete,
  onOpenVersions,
  onExportAll,
  onImportFile,
}) {
  const importRef = useRef(null)

  return (
    <div className="stack">
      <div className="tool-row">
        <span className="px-panel-title" style={{ margin: 0 }}>
          <span>Saved designs</span>
          <span className="muted" style={{ fontWeight: 400 }}>
            {designs.length} saved
          </span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="px-btn px-btn--sm px-btn--butter" onClick={onExportAll} disabled={designs.length === 0}>
            ⤓ export all
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ""
            }}
          />
          <button className="px-btn px-btn--sm px-btn--lavender" onClick={() => importRef.current?.click()}>
            ⇪ import
          </button>
        </div>
      </div>

      {usage && <div style={{ alignSelf: "flex-end" }}>{usage}</div>}

      {designs.length === 0 ? (
        <div className="px-panel px-panel--pad" style={{ textAlign: "center", padding: "56px 20px" }}>
          <p style={{ fontSize: 34, margin: "0 0 8px" }}>🎨</p>
          <p className="px-label" style={{ fontSize: 14 }}>
            no designs yet — draw something in the editor and hit “save design”
          </p>
        </div>
      ) : (
        <div className="designs-grid">
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              onLoad={onLoad}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onOpenVersions={onOpenVersions}
            />
          ))}
        </div>
      )}
    </div>
  )
}
