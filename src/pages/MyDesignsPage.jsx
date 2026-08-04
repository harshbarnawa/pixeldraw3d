import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import RequireAuth from "../components/RequireAuth.jsx"
import DesignCard from "../components/DesignCard.jsx"
import DesignUsage from "../components/DesignUsage.jsx"
import UpgradeDialog from "../components/UpgradeDialog.jsx"
import VersionHistoryModal from "../components/VersionHistoryModal.jsx"
import PublishDialog from "../components/PublishDialog.jsx"
import PlanBadge from "../components/PlanBadge.jsx"
import { useToast } from "../components/useToast.js"
import { useDesigns } from "../context/DesignsContext.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { saveWorkspace } from "../lib/storage.js"
import { setDesignPublic } from "../lib/cloudDesigns.js"
import { createPost, deletePostByDesign } from "../lib/community.js"

const SORTS = {
  recent: (a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
  oldest: (a, b) => String(a.updatedAt ?? "").localeCompare(String(b.updatedAt ?? "")),
  name: (a, b) => String(a.name).localeCompare(String(b.name)),
}

export default function MyDesignsPage() {
  return (
    <PageShell>
      <RequireAuth>
        <MyDesignsInner />
      </RequireAuth>
    </PageShell>
  )
}

function MyDesignsInner() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { designs, loading, isCloud, usage, renameDesign, duplicateDesign, deleteDesign, fetchVersions, restoreVersion } =
    useDesigns()

  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("recent")
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [versionsFor, setVersionsFor] = useState(null)
  const [publicOverride, setPublicOverride] = useState({})
  const [publishFor, setPublishFor] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const { toast, showToast } = useToast()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? designs.filter((d) => String(d.name).toLowerCase().includes(q)) : designs
    return [...list].sort(SORTS[sort] ?? SORTS.recent)
  }, [designs, query, sort])

  const handleLoad = (design) => {
    saveWorkspace({
      grid: design.grid,
      size: design.size,
      extrude: design.extrude ?? 2,
      randomLift: design.randomLift ?? 0,
      designId: design.id,
    })
    navigate("/")
  }

  const handleRename = async (id, name) => {
    const res = await renameDesign(id, name)
    showToast(res.ok ? "renamed" : "couldn't rename")
  }

  const handleDuplicate = async (id) => {
    const res = await duplicateDesign(id)
    if (!res.ok && res.reason === "quota") {
      setShowUpgrade(true)
      return
    }
    showToast(res.ok ? `duplicated “${res.design.name}”` : "couldn't duplicate")
  }

  const handleDelete = async (id) => {
    const res = await deleteDesign(id)
    showToast(res.ok ? "design deleted" : "couldn't delete")
  }

  const handleRestored = (design) => {
    showToast(`restored “${design.name}”`)
  }

  // Share flow: clicking the button on a private design opens the publish
  // dialog (design + quote → community post). Clicking it on a public design
  // unsets it back to private and removes the post.
  const handleTogglePublic = (design) => {
    if (design.isPublic) {
      setPublicOverride((o) => ({ ...o, [design.id]: false }))
      setDesignPublic(design.id, false)
        .then(() => deletePostByDesign(design.id))
        .then(() => showToast("set to private"))
        .catch((e) => {
          setPublicOverride((o) => ({ ...o, [design.id]: true }))
          showToast(e.message)
        })
    } else {
      setPublishFor(design)
    }
  }

  const handlePublish = async (quote) => {
    if (!publishFor) return
    setPublishing(true)
    try {
      const d = publishFor
      await setDesignPublic(d.id, true)
      await createPost({ body: quote, designId: d.id })
      setPublicOverride((o) => ({ ...o, [d.id]: true }))
      setPublishFor(null)
      showToast(quote ? "posted to the community ✨" : "shared to the community ✨")
    } catch (e) {
      showToast(e.message)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="px-page">
      <SectionHead kicker="02 · gallery" title="my designs" sub="your cloud-backed design library." />

      <div className="px-panel px-panel--pad">
        <div className="page-toolbar">
          {usage && <DesignUsage used={usage.used} limit={usage.limit} />}
          <input
            className="text-input search-box"
            type="search"
            placeholder="search designs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="text-input sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">recent</option>
            <option value="oldest">oldest</option>
            <option value="name">a → z</option>
          </select>
          <PlanBadge plan={profile?.current_plan} />
        </div>
      </div>

      <div className="stack mt-6">
        {loading ? (
          <div className="px-panel px-panel--pad" style={{ textAlign: "center", padding: "56px 20px" }}>
            <p className="px-label" style={{ fontSize: 14 }}>
              loading your designs…
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-panel px-panel--pad" style={{ textAlign: "center", padding: "56px 20px" }}>
            <p style={{ fontSize: 34, margin: "0 0 8px" }}>🎨</p>
            <p className="px-label" style={{ fontSize: 14 }}>
              {designs.length === 0
                ? "no designs yet — draw something on the home page and hit “save design”"
                : "no designs match that search"}
            </p>
          </div>
        ) : (
          <div className="designs-grid">
            {visible.map((d) => (
              <DesignCard
                key={d.id}
                design={{ ...d, isPublic: publicOverride[d.id] ?? d.isPublic }}
                onLoad={handleLoad}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onOpenVersions={isCloud ? (design) => setVersionsFor(design) : undefined}
                onTogglePublic={isCloud ? handleTogglePublic : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {toast && <div className="px-toast">{toast}</div>}
      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <PublishDialog
        design={publishFor}
        busy={publishing}
        onClose={() => setPublishFor(null)}
        onPublish={handlePublish}
      />
      <VersionHistoryModal
        open={!!versionsFor}
        design={versionsFor}
        onClose={() => setVersionsFor(null)}
        fetchVersions={fetchVersions}
        restoreVersion={restoreVersion}
        onRestored={handleRestored}
      />
    </div>
  )
}
