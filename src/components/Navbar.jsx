import { Link } from "react-router-dom"
import UserMenu from "./UserMenu.jsx"

export default function Navbar() {
  return (
    <nav className="px-nav">
      <div className="px-nav-inner">
        <Link to="/" className="logo" title="pixeldraw3d">
          <span className="logo-badge">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="sparkle">✦</span>
          <span className="logo-text">pixeldraw3d</span>
          <span className="sparkle">✧</span>
        </Link>
        <span className="tagline">draw a pixel · build a world</span>
        <Link to="/community" className="nav-link">
          feed
        </Link>
        <Link to="/templates" className="nav-link">
          templates
        </Link>
        <Link to="/guides" className="nav-link">
          guides
        </Link>
        <UserMenu />
      </div>
    </nav>
  )
}
