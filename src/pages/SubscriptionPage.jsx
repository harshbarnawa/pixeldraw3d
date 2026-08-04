import { useCallback, useEffect, useMemo, useState } from "react"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import RequireAuth from "../components/RequireAuth.jsx"
import PlanBadge from "../components/PlanBadge.jsx"
import { useToast } from "../components/useToast.js"
import { useAuth } from "../context/AuthContext.jsx"
import { cancelSubscription, fetchBilling, startCheckout } from "../lib/razorpay.js"
import { FEATURE, FEATURE_MATRIX, PLAN, PLAN_META, QUOTAS, getUserPlan, planTier } from "../lib/plans.js"

// Billing cycles. Yearly + lifetime are UI structure only until the payments
// phase lands; the toggle is live so the pricing cards preview them.
const CYCLES = [
  { id: "monthly", label: "monthly", unit: "/mo" },
  { id: "yearly", label: "yearly", unit: "/yr", soon: true },
  { id: "lifetime", label: "lifetime", unit: "one-time", soon: true },
]

// UI-only price previews for the future cycles.
const PRICE_BY_CYCLE = {
  monthly: { [PLAN.FREE]: 0, [PLAN.PLUS]: 99, [PLAN.PRO]: 299 },
  yearly: { [PLAN.FREE]: 0, [PLAN.PLUS]: 990, [PLAN.PRO]: 2990 },
  lifetime: { [PLAN.FREE]: 0, [PLAN.PLUS]: 1999, [PLAN.PRO]: 4999 },
}

const CARD_FEATURES = {
  [PLAN.FREE]: ["basic drawing", "basic export", "guest mode", "5 cloud designs", "2 image imports / day"],
  [PLAN.PLUS]: [
    "unlimited cloud designs",
    "10 image imports / day",
    "hd export",
    "private designs",
    "autosave",
    "unlimited undo",
  ],
  [PLAN.PRO]: [
    "everything in plus",
    "unlimited image imports",
    "animation export",
    "obj + glb export",
    "priority rendering",
    "experimental features",
  ],
}

// Subscription lifecycle shown on the billing summary.
const STATUS_META = {
  NONE: { label: "not subscribed", cls: "sub-chip" },
  ACTIVE: { label: "active", cls: "sub-chip sub-chip--good" },
  CANCELLED: { label: "cancelled", cls: "sub-chip sub-chip--warn" },
  EXPIRED: { label: "expired", cls: "sub-chip sub-chip--bad" },
}

// Feature comparison rows — every row reads plans.js, the same source the
// permission gates use, so the table can never drift from what's enforced.
const COMPARE_ROWS = [
  { kind: "quota", quotaKey: "cloudDesigns", label: "cloud designs" },
  { kind: "quota", quotaKey: "imageImportsPerDay", label: "image imports / day" },
  { kind: "feature", feature: FEATURE.HD_EXPORT, label: "hd export" },
  { kind: "feature", feature: FEATURE.PRIVATE_DESIGNS, label: "private designs" },
  { kind: "feature", feature: FEATURE.AUTOSAVE, label: "autosave" },
  { kind: "feature", feature: FEATURE.UNLIMITED_UNDO, label: "unlimited undo" },
  { kind: "feature", feature: FEATURE.NO_ADS, label: "no ads" },
  { kind: "feature", feature: FEATURE.PRIORITY_SUPPORT, label: "priority support" },
  { kind: "feature", feature: FEATURE.ANIMATION_EXPORT, label: "animation export" },
  { kind: "feature", feature: FEATURE.OBJ_EXPORT, label: "obj export" },
  { kind: "feature", feature: FEATURE.GLB_EXPORT, label: "glb export" },
  { kind: "feature", feature: FEATURE.PRIORITY_RENDER, label: "priority rendering" },
  { kind: "feature", feature: FEATURE.EXPERIMENTAL, label: "experimental features" },
]

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"

export default function SubscriptionPage() {
  const { profile, user, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [cycle, setCycle] = useState("monthly")
  const [busyPlan, setBusyPlan] = useState(null)
  const [billing, setBilling] = useState({ payments: [], invoices: [] })

  const plan = getUserPlan(profile)
  const tier = planTier(plan)
  const status = String(profile?.subscription_status ?? "NONE").toUpperCase()
  const statusMeta = STATUS_META[status] ?? STATUS_META.NONE

  // Real dates once a payment lands (edge function writes these).
  const nextBilling = profile?.next_billing_date
  const expiryDate = profile?.subscription_expires_at

  const loadBilling = useCallback(async () => {
    if (!user) return
    setBilling(await fetchBilling(user.id))
  }, [user])

  useEffect(() => {
    loadBilling()
  }, [loadBilling])

  const handleCheckout = async (target, cyc = "monthly") => {
    setBusyPlan(target)
    try {
      const res = await startCheckout({
        plan: target,
        cycle: cyc,
        refreshProfile,
        onActivated: () => {},
      })
      if (res.status === "paid") {
        showToast(`welcome to ${PLAN_META[target].label} 🎉`)
        loadBilling()
      } else if (res.status === "error") {
        showToast(typeof res.data === "string" ? res.data : "payment didn't go through")
      }
      // "dismissed" → silently ignore
    } catch (e) {
      showToast(e.message)
    } finally {
      setBusyPlan(null)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelSubscription()
      refreshProfile()
      showToast("subscription cancelled — access stays until it expires")
    } catch (e) {
      showToast(e.message)
    }
  }

  const cellFor = (row, p) => {
    if (row.kind === "quota") {
      const q = QUOTAS[row.quotaKey]?.[p]
      return q === Infinity ? "∞" : String(q)
    }
    return FEATURE_MATRIX[p]?.has(row.feature) ? "✓" : "—"
  }

  const cycleMeta = CYCLES.find((c) => c.id === cycle) ?? CYCLES[0]

  return (
    <PageShell>
      <RequireAuth>
        <div className="px-page">
          <SectionHead
            kicker="04 · membership"
            title="subscription"
            sub="pick the plan that fits your pixel ambitions."
          />

          {/* ----- billing summary ----- */}
          <div className="px-panel px-panel--pad sub-summary">
            <div className="sub-summary-head">
              <div>
                <p className="px-label">current plan</p>
                <div className="sub-plan-line">
                  <span className="sub-plan-name">{PLAN_META[plan].label}</span>
                  <PlanBadge plan={profile?.current_plan} />
                  <span className={statusMeta.cls}>{statusMeta.label}</span>
                </div>
              </div>
              <div className="sub-actions">
                {plan === PLAN.FREE ? (
                  <button
                    type="button"
                    className="px-btn px-btn--mint"
                    disabled={busyPlan === PLAN.PLUS}
                    onClick={() => handleCheckout(PLAN.PLUS)}
                  >
                    {busyPlan === PLAN.PLUS ? "opening…" : "↑ upgrade"}
                  </button>
                ) : status === "ACTIVE" ? (
                  <button type="button" className="px-btn px-btn--white" onClick={handleCancel}>
                    ✕ cancel subscription
                  </button>
                ) : status === "CANCELLED" ? (
                  <button
                    type="button"
                    className="px-btn px-btn--mint"
                    disabled={busyPlan === plan}
                    onClick={() => handleCheckout(plan)}
                  >
                    {busyPlan === plan ? "opening…" : "↻ renew"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="px-btn px-btn--mint"
                    disabled={busyPlan === PLAN.PLUS}
                    onClick={() => handleCheckout(PLAN.PLUS)}
                  >
                    {busyPlan === PLAN.PLUS ? "opening…" : "↑ upgrade"}
                  </button>
                )}
              </div>
            </div>

            <div className="sub-facts">
              <div className="sub-fact">
                <span className="px-label">billing cycle</span>
                <span>{profile?.billing_cycle ? String(profile.billing_cycle).toLowerCase() : "monthly"}</span>
              </div>
              <div className="sub-fact">
                <span className="px-label">next billing date</span>
                <span>{fmtDate(nextBilling)}</span>
              </div>
              <div className="sub-fact">
                <span className="px-label">expiry date</span>
                <span>{fmtDate(expiryDate)}</span>
              </div>
              <div className="sub-fact">
                <span className="px-label">member since</span>
                <span>{fmtDate(profile?.created_at)}</span>
              </div>
            </div>
          </div>

          {/* ----- cycle toggle + pricing cards ----- */}
          <div className="sub-cycle">
            {CYCLES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`px-btn px-btn--sm ${cycle === c.id ? "px-btn--active" : "px-btn--white"}`}
                onClick={() => setCycle(c.id)}
              >
                {c.label}
                {c.soon && <span className="soon-tag">soon</span>}
              </button>
            ))}
          </div>

          <div className="price-grid">
            {[PLAN.FREE, PLAN.PLUS, PLAN.PRO].map((p) => {
              const meta = PLAN_META[p]
              const isCurrent = p === plan && cycle === "monthly"
              const price = PRICE_BY_CYCLE[cycle]?.[p] ?? 0
              const isSoon = cycle !== "monthly"
              const ctaLabel = isCurrent
                ? "current plan"
                : isSoon
                  ? "coming soon"
                  : planTier(p) > tier
                    ? "upgrade"
                    : "downgrade"
              return (
                <div key={p} className={`px-panel px-panel--pad price-card${isCurrent ? " price-card--current" : ""}`}>
                  <div className="price-card-head">
                    <span className="price-name">{meta.label}</span>
                    <PlanBadge plan={p} />
                  </div>
                  <div className="price">
                    ₹{price}
                    <span className="price-per">{cycleMeta.unit}</span>
                  </div>
                  <ul>
                    {CARD_FEATURES[p].map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`px-btn ${isCurrent || isSoon ? "px-btn--white" : "px-btn--mint"}`}
                    disabled={isCurrent || busyPlan === p}
                    onClick={() => {
                      if (isSoon) {
                        showToast("yearly & lifetime land in a future phase")
                        return
                      }
                      if (planTier(p) < tier) {
                        handleCancel()
                        return
                      }
                      handleCheckout(p)
                    }}
                  >
                    {busyPlan === p ? "opening…" : ctaLabel}
                  </button>
                </div>
              )
            })}
          </div>

          {/* ----- billing history ----- */}
          <div className="px-panel px-panel--pad mt-6">
            <h3 className="px-panel-title">
              <span>billing history</span>
            </h3>
            {billing.payments.length === 0 ? (
              <div className="billing-empty">
                <p style={{ fontSize: 30, margin: 0 }}>🧾</p>
                <p className="muted" style={{ margin: "6px 0 0" }}>no transactions yet.</p>
              </div>
            ) : (
              <ul className="billing-list">
                {billing.payments.map((p) => (
                  <li key={p.id}>
                    <span className="billing-plan">
                      {p.plan} · {p.cycle}
                    </span>
                    <span className="billing-amount">₹{(p.amount / 100).toFixed(0)}</span>
                    <span className={`billing-status billing-status--${p.status}`}>{p.status}</span>
                    <span className="muted billing-date">{fmtDate(p.verified_at ?? p.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ----- feature comparison ----- */}
          <div className="px-panel px-panel--pad mt-6">
            <h3 className="px-panel-title">compare plans</h3>
            <div className="table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>feature</th>
                    <th>free</th>
                    <th>plus</th>
                    <th>pro</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {[PLAN.FREE, PLAN.PLUS, PLAN.PRO].map((p) => (
                        <td key={p} className={cellFor(row, p) === "✓" ? "tick" : "cross"}>
                          {cellFor(row, p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </RequireAuth>
    </PageShell>
  )
}
