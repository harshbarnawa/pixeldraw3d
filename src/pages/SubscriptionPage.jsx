import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import RequireAuth from "../components/RequireAuth.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { PLAN, PLAN_META } from "../lib/plans.js"

const PRICING = [
  {
    plan: PLAN.FREE,
    features: ["basic drawing", "basic export", "guest mode", "5 cloud designs", "2 image imports / day"],
  },
  {
    plan: PLAN.PLUS,
    features: ["unlimited cloud designs", "10 image imports / day", "hd export", "private designs", "autosave"],
  },
  {
    plan: PLAN.PRO,
    features: ["everything in plus", "unlimited image imports", "animation export", "obj + glb export", "priority rendering"],
  },
]

export default function SubscriptionPage() {
  const { profile } = useAuth()
  return (
    <PageShell>
      <RequireAuth>
        <div className="px-page">
          <SectionHead kicker="04 · membership" title="subscription" sub="pick the plan that fits your pixel ambitions." />
          <div className="price-grid">
            {PRICING.map(({ plan, features }) => {
              const meta = PLAN_META[plan]
              const current = profile?.current_plan === plan
              return (
                <div key={plan} className={`px-panel px-panel--pad price-card${current ? " price-card--current" : ""}`}>
                  <div className="price-name">{meta.label}</div>
                  <div className="price">
                    ₹{meta.price}
                    <span className="price-per">/mo</span>
                  </div>
                  <ul>
                    {features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {current && <span className="plan-badge plan-badge--current">current plan</span>}
                </div>
              )
            })}
          </div>
          <p className="muted mt-4">payments (razorpay) and full billing land in a later phase.</p>
        </div>
      </RequireAuth>
    </PageShell>
  )
}
