import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext.jsx"
import { DesignsProvider } from "./context/DesignsContext.jsx"

// The editor is the landing route, so it stays eager. Every other page is
// code-split and fetched on demand.
import HomePage from "./pages/HomePage.jsx"
const MyDesignsPage = lazy(() => import("./pages/MyDesignsPage.jsx"))
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"))
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"))
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage.jsx"))
const CommunityPage = lazy(() => import("./pages/CommunityPage.jsx"))
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage.jsx"))
const DesignPage = lazy(() => import("./pages/DesignPage.jsx"))
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"))
const PrivacyPage = lazy(() => import("./pages/PrivacyPage.jsx"))
const TermsPage = lazy(() => import("./pages/TermsPage.jsx"))
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"))
const TemplatesPage = lazy(() => import("./pages/TemplatesPage.jsx"))
const GuidesPage = lazy(() => import("./pages/GuidesPage.jsx"))
const GuidePage = lazy(() => import("./pages/GuidePage.jsx"))

function PageFallback() {
  return (
    <div className="px-page" style={{ textAlign: "center", padding: "80px 20px" }}>
      <p className="px-label" style={{ fontSize: 14 }}>
        loading…
      </p>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <DesignsProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/u/:username" element={<PublicProfilePage />} />
              <Route path="/d/:id" element={<DesignPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-designs" element={<MyDesignsPage />} />
              <Route path="/subscribe" element={<SubscriptionPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/guides" element={<GuidesPage />} />
              <Route path="/guides/:slug" element={<GuidePage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DesignsProvider>
    </AuthProvider>
  )
}
