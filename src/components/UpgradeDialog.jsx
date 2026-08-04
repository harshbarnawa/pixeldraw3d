import { Link } from "react-router-dom"

// Shown when a FREE user hits their cloud-design quota. Links to /subscribe.
export default function UpgradeDialog({ open, onClose }) {
  if (!open) return null
  return (
    <div className="color-backdrop" onClick={onClose}>
      <div className="color-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cd-head">
          <span className="px-panel-title" style={{ margin: 0 }}>
            plan limit reached
          </span>
          <button type="button" className="mini-btn" onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>
        <p style={{ margin: "0 0 4px" }}>you've used all your cloud designs on the free plan.</p>
        <p className="muted" style={{ margin: "0 0 14px" }}>
          existing designs stay editable — upgrade for unlimited cloud designs.
        </p>
        <div className="cd-foot" style={{ marginTop: 0 }}>
          <Link to="/subscribe" className="px-btn px-btn--mint" onClick={onClose}>
            ✦ upgrade
          </Link>
          <button type="button" className="px-btn px-btn--white" onClick={onClose}>
            not now
          </button>
        </div>
      </div>
    </div>
  )
}
