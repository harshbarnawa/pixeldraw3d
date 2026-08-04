import { useEffect, useMemo, useRef, useState } from "react"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import VoxelBuilder from "../components/VoxelBuilder.jsx"
import DesignLibrary from "../components/DesignLibrary.jsx"
import DesignUsage from "../components/DesignUsage.jsx"
import ImageImporter from "../components/ImageImporter.jsx"
import UpgradeDialog from "../components/UpgradeDialog.jsx"
import VersionHistoryModal from "../components/VersionHistoryModal.jsx"
import { useToast } from "../components/useToast.js"
import { useDesigns } from "../context/DesignsContext.jsx"
import { DEFAULT_PRESET, DEFAULT_SIZE, PALETTE } from "../constants.js"
import { emptyGrid, presetToGrid } from "../lib/grid.js"
import {
  downloadDesigns,
  loadCustomColors,
  loadWorkspace,
  parseDesignsFile,
  persistCustomColors,
  saveWorkspace,
} from "../lib/storage.js"

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })

// The editor home page — guests keep local storage, signed-in users get cloud
// sync (via DesignsContext). Every existing feature is preserved.
export default function HomePage() {
  // ----- workspace (lifted so Designs + Importer can drive the editor) -----
  const [saved] = useState(loadWorkspace)
  const [gridSize, setGridSize] = useState(saved?.size ?? DEFAULT_SIZE)
  const [grid, setGrid] = useState(
    () => saved?.grid ?? (DEFAULT_PRESET ? presetToGrid(DEFAULT_PRESET) : emptyGrid(DEFAULT_SIZE)),
  )
  const [extrude, setExtrude] = useState(saved?.extrude ?? 2)
  const [randomLift, setRandomLift] = useState(saved?.randomLift ?? 0)
  const [activeDesignId, setActiveDesignId] = useState(saved?.designId ?? null)

  // ----- custom colors -----
  const [customColors, setCustomColors] = useState(loadCustomColors)
  const palette = useMemo(() => [...PALETTE, ...customColors], [customColors])

  // ----- design library (local for guests, cloud when signed in) -----
  const {
    designs,
    isCloud,
    usage,
    createDesign,
    updateDesign,
    renameDesign,
    duplicateDesign,
    deleteDesign,
    importDesigns,
    fetchVersions,
    restoreVersion,
  } = useDesigns()

  // ----- toast + dialogs -----
  const { toast, showToast } = useToast()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [versionsFor, setVersionsFor] = useState(null)
  const handleOpenVersions = (design) => setVersionsFor(design)

  // auto-save workspace for crash recovery (restores the open cloud design too)
  useEffect(() => {
    const t = setTimeout(
      () => saveWorkspace({ grid, size: gridSize, extrude, randomLift, designId: activeDesignId }),
      300,
    )
    return () => clearTimeout(t)
  }, [grid, gridSize, extrude, randomLift, activeDesignId])

  // cloud auto-save: sync the open design after a quiet moment, debounced
  const autosaveTimer = useRef(null)
  const activeCloud = isCloud && activeDesignId && designs.some((d) => d.id === activeDesignId)
  useEffect(() => {
    if (!activeCloud) return
    clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      updateDesign(activeDesignId, { grid, size: gridSize, extrude, randomLift })
    }, 1200)
    return () => clearTimeout(autosaveTimer.current)
  }, [grid, gridSize, extrude, randomLift, activeCloud, activeDesignId, updateDesign])

  // ----- handlers -----
  const handleAddColor = (hex) => {
    if (customColors.includes(hex)) {
      showToast(`${hex} already in palette`)
      return
    }
    const next = [...customColors, hex]
    setCustomColors(next)
    persistCustomColors(next)
    showToast(`added ${hex}`)
  }

  const handleRequestSave = async ({ grid: g, size, extrude: ex, randomLift: rl }) => {
    if (activeCloud) {
      const res = await updateDesign(activeDesignId, { grid: g, size, extrude: ex, randomLift: rl }, { createVersion: true })
      showToast(res.ok ? "saved + version snapshot" : "couldn't save")
      return
    }
    const res = await createDesign({ grid: g, size, extrude: ex, randomLift: rl })
    if (!res.ok && res.reason === "quota") {
      setShowUpgrade(true)
      return
    }
    if (!res.ok) {
      showToast("couldn't save")
      return
    }
    setActiveDesignId(res.design.id)
    showToast(`saved “${res.design.name}”`)
  }

  const handleLoad = (design) => {
    setGrid(design.grid)
    setGridSize(design.size)
    setExtrude(design.extrude ?? 2)
    setRandomLift(design.randomLift ?? design.randomHeight ?? 0)
    setActiveDesignId(design.id)
    scrollTo("editor")
    showToast(`loaded “${design.name}”`)
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

  const handleImportFile = async (file) => {
    try {
      const text = await file.text()
      const { list } = parseDesignsFile(text, [])
      const res = await importDesigns(list)
      if (res?.quotaHit) setShowUpgrade(true)
      showToast(res && res.added > 0 ? `imported ${res.added} design${res.added > 1 ? "s" : ""}` : "nothing new to import")
    } catch {
      showToast("couldn't read that file")
    }
  }

  const handleApplyFromImporter = ({ grid: g, size }) => {
    setGrid(g)
    setGridSize(size)
    scrollTo("editor")
    showToast("sent to slate ✦")
  }

  const handleRestored = (design) => {
    setGrid(design.grid)
    setGridSize(design.size)
    setExtrude(design.extrude ?? 2)
    setRandomLift(design.randomLift ?? 0)
    setActiveDesignId(design.id)
    scrollTo("editor")
    showToast("restored a previous version")
  }

  return (
    <PageShell>
      {/* editor */}
      <section id="editor" className="px-section">
        <SectionHead
          kicker="01 · draw"
          title="slate → voxels"
          sub="paint on the grid, watch every pixel pop into a 3D cube."
        />
        <VoxelBuilder
          grid={grid}
          size={gridSize}
          setGrid={setGrid}
          setSize={setGridSize}
          extrude={extrude}
          setExtrude={setExtrude}
          randomLift={randomLift}
          setRandomLift={setRandomLift}
          palette={palette}
          onAddColor={handleAddColor}
          onRequestSave={handleRequestSave}
          onOpenDesigns={() => scrollTo("designs")}
        />
      </section>

      {/* image → pixel */}
      <section id="convert" className="px-section">
        <SectionHead
          kicker="02 · convert"
          title="image → pixel"
          sub="drop any photo and turn it into a pixel grid — right onto your slate."
        />
        <ImageImporter onApply={handleApplyFromImporter} palette={palette} />
      </section>

      {/* saved designs */}
      <section id="designs" className="px-section">
        <SectionHead
          kicker="03 · gallery"
          title="saved designs"
          sub={isCloud ? "your designs, synced to the cloud." : "your pixel creations, stored right in this browser."}
        />
        <DesignLibrary
          designs={designs}
          usage={usage ? <DesignUsage used={usage.used} limit={usage.limit} /> : null}
          onLoad={handleLoad}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onOpenVersions={isCloud ? handleOpenVersions : undefined}
          onExportAll={() => downloadDesigns(designs)}
          onImportFile={handleImportFile}
        />
      </section>

      {toast && <div className="px-toast">{toast}</div>}
      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <VersionHistoryModal
        open={!!versionsFor}
        design={versionsFor}
        onClose={() => setVersionsFor(null)}
        fetchVersions={fetchVersions}
        restoreVersion={restoreVersion}
        onRestored={handleRestored}
      />
    </PageShell>
  )
}
