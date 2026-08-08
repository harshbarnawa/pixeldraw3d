import { Link } from "react-router-dom"
import { DEV_URL } from "../constants.js"

export default function Footer() {
  return (
    <footer className="px-footer">
      <div>pixeldraw3d ✦ draw a pixel, build a world — every pixel becomes a cube</div>
      <nav className="px-footer-links" aria-label="footer">
        <Link to="/about">about</Link>
        <Link to="/templates">templates</Link>
        <Link to="/guides">guides</Link>
        <Link to="/contact">contact</Link>
        <Link to="/privacy">privacy</Link>
        <Link to="/terms">terms</Link>
      </nav>
      <div className="px-footer-author">
        developed by{" "}
        <a href={DEV_URL} target="_blank" rel="noreferrer" className="px-footer-link">
          Harsh Barnawa
        </a>
        <span className="muted">·</span>
        <a href={DEV_URL} target="_blank" rel="noreferrer" className="px-footer-link">
          about developer ↗
        </a>
      </div>
    </footer>
  )
}
