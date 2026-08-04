import { PLAN, PLAN_META } from "../lib/plans.js"

// FREE gets no badge; PLUS is blue, PRO is gold.
export default function PlanBadge({ plan, className = "" }) {
  const meta = PLAN_META[plan] ?? PLAN_META[PLAN.FREE]
  if (!meta.badge) return null
  return <span className={`plan-badge plan-badge--${meta.badge} ${className}`}>{meta.label}</span>
}
