const DEV_URL = "https://harshbarnawa.vercel.app/"

export default function Footer() {
  return (
    <footer className="px-footer">
      <div>pixeldraw3d ✦ draw a pixel, build a world — every pixel becomes a cube</div>
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
