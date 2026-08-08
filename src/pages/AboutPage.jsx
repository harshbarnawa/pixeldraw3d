import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { DEV_URL } from "../constants.js"

const FEATURES = [
  {
    emoji: "🎨",
    title: "Pixel editor",
    body: "Draw, erase, and bucket-fill on a pixel slate with mirror symmetry, quick presets, and undo/redo.",
  },
  {
    emoji: "🖼️",
    title: "Image → pixel",
    body: "Drop any photo and turn it into a pixel grid — with cube mode for vivid cube-art colors.",
  },
  {
    emoji: "🧊",
    title: "2D → 3D",
    body: "Every pixel pops into a 3D cube. Extrude, add random lift, and orbit around your sculpture.",
  },
  {
    emoji: "💾",
    title: "Saved designs",
    body: "Keep designs in your browser, or sign in to sync them to the cloud across devices.",
  },
  {
    emoji: "🌐",
    title: "Community",
    body: "Publish designs, like and share work, follow creators, and remix anything public.",
  },
  {
    emoji: "📦",
    title: "Exports",
    body: "Export PNG snapshots, HD renders, OBJ/GLB 3D models, and animations of your work.",
  },
]

export default function AboutPage() {
  usePageMeta(
    "About",
    "pixeldraw3d is a free pastel pixel-art studio that turns 2D drawings into 3D voxel cubes. Draw, convert photos, export 3D models, and share with the community.",
  )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead
          kicker="about"
          title="draw a pixel, build a world"
          sub="pixeldraw3d is a free, browser-based pixel-art studio where every pixel you draw becomes a 3D cube."
        />

        <div className="px-panel px-panel--pad legal">
          <p>
            pixeldraw3d is built around one simple idea: <strong>draw a pixel, build a world</strong>. Paint on a 2D
            slate, and every filled pixel instantly pops into a 3D cube you can orbit, extrude, and export. There's no
            install, no account needed to start — just open the site and draw.
          </p>
        </div>

        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card px-panel px-panel--pad">
              <div className="feature-card-emoji">{f.emoji}</div>
              <h3 className="px-panel-title">{f.title}</h3>
              <p className="muted feature-card-body">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="px-panel px-panel--pad legal">
          <h3 className="px-panel-title">What you can do here</h3>
          <p>
            Sketch from scratch on the <Link to="/">editor</Link>, turn a photo into pixels, push your drawing into 3D,
            save your favorites, and publish them to the{" "}
            <Link to="/community">community</Link> where anyone can remix them. New to the tool? The{" "}
            <Link to="/guides">guides</Link> walk you through every feature step by step, and the{" "}
            <Link to="/templates">templates</Link> give you a head start.
          </p>
        </div>

        <div className="px-panel px-panel--pad legal">
          <h3 className="px-panel-title">Who built it</h3>
          <p>
            pixeldraw3d is developed by <a href={DEV_URL} target="_blank" rel="noreferrer" className="px-footer-link">Harsh Barnawa</a>,
            a front-end developer who likes pastel palettes and chunky 3D cubes. The site is built with React, Three.js
            (via react-three-fiber), and Supabase, and runs entirely in your browser.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
