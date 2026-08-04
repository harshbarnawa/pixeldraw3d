// "3 / 5 Designs Used" meter for the cloud library. Unlimited plans hide the
// progress bar and just show the count.
export default function DesignUsage({ used, limit }) {
  const unlimited = !Number.isFinite(limit)
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100)
  return (
    <div
      className="usage"
      title={unlimited ? "unlimited cloud designs" : `${used} of ${limit} cloud designs used`}
    >
      <span className="px-label">
        {unlimited
          ? `${used} design${used === 1 ? "" : "s"} saved`
          : `${used} / ${limit} designs used`}
      </span>
      {!unlimited && (
        <div className="usage-track">
          <div className="usage-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
