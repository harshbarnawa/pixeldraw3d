import PageShell from "../components/PageShell.jsx"
import SectionHead from "../components/SectionHead.jsx"
import { usePageMeta } from "../lib/seo.js"
import { CONTACT_EMAIL } from "../constants.js"

const LAST_UPDATED = "August 9, 2026"

const SECTIONS = [
  {
    heading: "Overview",
    body: [
      "This Privacy Policy explains what information pixeldraw3d collects, how it's used, and the choices you have. By using the site you agree to the practices described here.",
      "The short version: pixeldraw3d is a pixel-art tool. You can use it without an account, and you're never required to share personal information just to draw.",
    ],
  },
  {
    heading: "Information we collect",
    body: [
      "Account information — if you sign in with Google, we receive the profile information Google shares with us (your name, email address, and profile photo). You can sign out or clear the browser's saved sign-in at any time.",
      "Designs and posts — the designs you save and the posts you publish to the community are stored so you (and, for public posts, other visitors) can see them.",
      "Usage data — basic, anonymized details such as which pages you visit help us understand how the site is used. This does not include your personal identity.",
    ],
  },
  {
    heading: "How we store your data",
    body: [
      "Guests: if you're not signed in, your designs and preferences are stored locally in your browser (localStorage). Clearing your browser data removes them.",
      "Signed-in users: your designs sync to our cloud database (hosted with Supabase) so they're available across devices. You can delete individual designs anytime, or contact us to request removal of your account data.",
    ],
  },
  {
    heading: "Cookies and local storage",
    body: [
      "We use local storage to remember your theme choice and session. These are necessary for the site to work the way you expect.",
      "Third parties, including Google, may use cookies to serve ads on our site. See the Advertising section below for details and how to opt out.",
    ],
  },
  {
    heading: "Advertising",
    body: [
      "We display advertising on pixeldraw3d through Google AdSense. Google and its advertising partners may use cookies (such as the DoubleClick cookie) to serve ads based on your visits to this site and other sites across the internet.",
      "You can opt out of personalized advertising by visiting Google Ads Settings (https://adssettings.google.com). You can also opt out of some third-party vendors' cookies at www.aboutads.info.",
      "For more information, read Google's Advertising Privacy Policy at policies.google.com/technologies/ads.",
    ],
  },
  {
    heading: "Third-party services",
    body: [
      "pixeldraw3d relies on a small number of service providers: Google (sign-in and advertising), Supabase (data storage and authentication), and Razorpay (payment processing for subscriptions). Each provider processes data under its own privacy policy and our agreement with it.",
    ],
  },
  {
    heading: "Children's privacy",
    body: [
      "pixeldraw3d is a general-audience creative tool and is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, contact us and we will delete it.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can delete any saved design at any time, sign out of your account, or clear the site's local storage in your browser settings. To delete your account or request that we remove stored data, contact us using the address below.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "We may update this policy from time to time. When we do, we'll revise the \"Last updated\" date at the top of this page. Continued use of the site after changes means you accept the updated policy.",
    ],
  },
]

export default function PrivacyPage() {
  usePageMeta(
    "Privacy Policy",
    "How pixeldraw3d collects, stores, and protects your data, including our use of cookies and Google AdSense advertising.",
  )

  return (
    <PageShell>
      <div className="px-page">
        <SectionHead
          kicker="privacy policy"
          title="privacy"
          sub={`Last updated: ${LAST_UPDATED}. Your data stays yours — here's what we collect and why.`}
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
            Questions about this policy? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="px-footer-link">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </PageShell>
  )
}
