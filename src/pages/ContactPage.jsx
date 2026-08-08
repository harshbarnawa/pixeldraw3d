import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { CONTACT_EMAIL, DEV_URL } from "../constants.js"

export default function ContactPage() {
  usePageMeta(
    "Contact",
    "Get in touch with the pixeldraw3d team — questions, feedback, and support for the pastel pixel-art studio.",
  )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead
          kicker="contact"
          title="say hello"
          sub="Questions, feedback, or something not working? We'd love to hear from you."
        />

        <div className="px-panel px-panel--pad contact-card">
          <div style={{ fontSize: 36, marginBottom: 4 }}>✉️</div>
          <p className="muted" style={{ margin: "4px 0 16px" }}>
            The fastest way to reach us is email. We usually reply within a couple of days.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="px-btn px-btn--mint" style={{ display: "inline-flex" }}>
            email {CONTACT_EMAIL}
          </a>
        </div>

        <div className="px-panel px-panel--pad legal">
          <h3 className="px-panel-title">Report a problem</h3>
          <p>
            Found a bug or something confusing? Describe what you were doing and what happened — screenshots help a
            lot. If it's about a specific design, include its share link.
          </p>
        </div>

        <div className="px-panel px-panel--pad legal">
          <h3 className="px-panel-title">About the developer</h3>
          <p>
            pixeldraw3d is developed by{" "}
            <a href={DEV_URL} target="_blank" rel="noreferrer" className="px-footer-link">
              Harsh Barnawa
            </a>
            . You can read more about the project on the <a href="/about" className="px-footer-link">about page</a>.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
