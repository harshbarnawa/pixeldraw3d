export default function SectionHead({ kicker, title, sub }) {
  return (
    <div className="px-section-head">
      <span className="px-kicker">{kicker}</span>
      <h2 className="px-section-title">{title}</h2>
      {sub && <p className="px-section-sub">{sub}</p>}
    </div>
  )
}
