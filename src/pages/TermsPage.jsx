import { Link } from "react-router-dom"
import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { CONTACT_EMAIL } from "../constants.js"

const LAST_UPDATED = "August 9, 2026"

const SECTIONS = [
  {
    heading: "Agreement to terms",
    body: [
      "These Terms of Service govern your use of pixeldraw3d (the \"Service\"). By accessing or using the Service, you agree to be bound by these terms. If you do not agree, please do not use the Service.",
    ],
  },
  {
    heading: "The Service",
    body: [
      "pixeldraw3d is a browser-based pixel-art tool that lets you draw pixel grids, convert images to pixel art, view your drawings as 3D voxel cubes, and share designs with the community. The Service is provided free of charge, with optional paid features described on the Subscription page.",
    ],
  },
  {
    heading: "Accounts",
    body: [
      "Signing in with Google creates an account that syncs your designs across devices and lets you publish to the community. You are responsible for the activity on your account and for keeping your Google sign-in secure. You may stop using the Service at any time.",
    ],
  },
  {
    heading: "Your content",
    body: [
      "You retain ownership of the designs and posts you create. When you publish a design to the community, you grant us a limited license to display and distribute it within the Service so other users can view, like, and remix it. You confirm that content you publish is yours to share and does not infringe anyone else's rights.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "You agree not to use the Service to post unlawful, defamatory, or abusive content, to attempt to access other users' accounts or private data, to upload malicious software, or to interfere with the normal operation of the Service. We may remove content or suspend accounts that violate these rules.",
    ],
  },
  {
    heading: "Subscriptions and payments",
    body: [
      "Some features (such as autosave, unlimited undo, HD and 3D exports) are available on a paid subscription. Payments are processed securely by Razorpay, our payment provider. By subscribing you agree to Razorpay's terms, and you may cancel your subscription through the Subscription page at any time.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The pixeldraw3d name, logo, and site design belong to the site's developer. Your own creations remain yours. You may not use our branding without permission.",
    ],
  },
  {
    heading: "Disclaimers",
    body: [
      "The Service is provided \"as is\" and \"as available,\" without warranties of any kind, express or implied. While we work hard to keep the site available and your data safe, we do not guarantee uninterrupted or error-free operation.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "To the maximum extent permitted by law, pixeldraw3d and its developer are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms as the Service evolves. Updated terms will show a revised \"Last updated\" date. Continued use of the Service after changes take effect means you accept the new terms.",
    ],
  },
]

export default function TermsPage() {
  usePageMeta(
    "Terms of Service",
    "The terms of service governing your use of pixeldraw3d — the pixel-art studio that turns drawings into 3D cubes.",
  )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead
          kicker="terms of service"
          title="terms"
          sub={`Last updated: ${LAST_UPDATED}. The rules that keep pixeldraw3d friendly for everyone.`}
        />

        {SECTIONS.map((s) => (
          <div key={s.heading} className="px-panel px-panel--pad legal">
            <h3 className="px-panel-title">{s.heading}</h3>
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ))}

        <div className="px-panel px-panel--pad legal">
          <h3 className="px-panel-title">Contact</h3>
          <p>
            Questions about these terms? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="px-footer-link">
              {CONTACT_EMAIL}
            </a>{" "}
            or visit the <Link to="/contact">contact page</Link>.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
