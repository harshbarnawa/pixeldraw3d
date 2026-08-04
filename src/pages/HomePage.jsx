import { useEffect, useMemo, useRef, useState } from "react"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import VoxelBuilder from "../components/VoxelBuilder.jsx"
import DesignLibrary from "../components/DesignLibrary.jsx"
import ImageImporter from "../components/ImageImporter.jsx"
import { DEFAULT_PRESET, DEFAULT_SIZE, PALETTE } from "../constants.js"
import { emptyGrid, presetToGrid } from "../lib/grid.js"
import {
  createId,
  downloadDesigns,
  loadCustomColors,
  loadDesigns,
  loadWorkspace,
  nextDesignName,
  parseDesignsFile,
  persistCustomColors,
  persistDesigns,
  saveWorkspace,
} from "../lib/storage.js"

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })

// The editor home page — every existing feature, unchanged.
export default function HomePage() {
  // ----- workspace (lifted so Designs + Importer can drive the editor) -----
  const [saved] = useState(loadWorkspace)
  const [gridSize, setGridSize] = useState(saved?.size ?? DEFAULT_SIZE)
  const [grid, setGrid] = useState(
    () => saved?.grid ?? (DEFAULT_PRESET ? presetToGrid(DEFAULT_PRESET) : emptyGrid(DEFAULT_SIZE)),
  )
  const [extrude, setExtrude] = useState(saved?.extrude ?? 2)
  const [randomLift, setRandomLift] = useState(saved?.randomLift ?? 0)

  // ----- design library + custom colors -----
  const [designs, setDesigns] = useState(loadDesigns)
  const [customColors, setCustomColors] = useState(loadCustomColors)
  const palette = useMemo(() => [...PALETTE, ...customColors], [customColors])

  // ----- toast -----
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }

  // auto-save workspace for crash recovery
  useEffect(() => {
    const t = setTimeout(() => saveWorkspace({ grid, gridSize, extrude, randomLift }), 300)
    return () => clearTimeout(t)
  }, [grid, gridSize, extrude, randomLift])

  const updateDesigns = (next) => {
    setDesigns(next)
    persistDesigns(next)
  }

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

  const handleRequestSave = ({ grid: g, size, extrude: ex, randomLift: rl }) => {
    const now = new Date().toISOString()
    const design = {
      id: createId(),
      name: nextDesignName(designs),
      grid: g,
      size,
      extrude: ex,
      randomLift: rl,
      createdAt: now,
      updatedAt: now,
    }
    updateDesigns([...designs, design])
    showToast(`saved “${design.name}”`)
  }

  const handleLoad = (design) => {
    setGrid(design.grid)
    setGridSize(design.size)
    setExtrude(design.extrude ?? 2)
    setRandomLift(design.randomLift ?? design.randomHeight ?? 0)
    scrollTo("editor")
    showToast(`loaded “${design.name}”`)
  }

  const handleRename = (id, name) => {
    updateDesigns(designs.map((d) => (d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d)))
    showToast("renamed")
  }

  const handleDuplicate = (id) => {
    const src = designs.find((d) => d.id === id)
    if (!src) return
    const now = new Date().toISOString()
    updateDesigns([
      ...designs,
      { ...src, id: createId(), name: `${src.name} copy`, createdAt: now, updatedAt: now },
    ])
    showToast(`duplicated “${src.name}”`)
  }

  const handleDelete = (id) => {
    updateDesigns(designs.filter((d) => d.id !== id))
    showToast("design deleted")
  }

  const handleImportFile = async (file) => {
    try {
      const text = await file.text()
      const { list, added } = parseDesignsFile(text, designs)
      updateDesigns(list)
      showToast(added > 0 ? `imported ${added} design${added > 1 ? "s" : ""}` : "nothing new to import")
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
          sub="your pixel creations, stored right in the browser."
        />
        <DesignLibrary
          designs={designs}
          onLoad={handleLoad}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onExportAll={() => downloadDesigns(designs)}
          onImportFile={handleImportFile}
        />
      </section>

      {toast && <div className="px-toast">{toast}</div>}
    </PageShell>
  )
}
