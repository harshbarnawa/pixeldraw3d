import Navbar from "./Navbar.jsx"
import Footer from "./Footer.jsx"

// Shared page layout: pixel nav on top, content in the standard gutter,
// footer below. Used by the home editor and every routed page.
export default function PageShell({ children }) {
  return (
    <div className="app">
      <Navbar />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  )
}
