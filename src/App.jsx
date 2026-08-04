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
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-designs" element={<MyDesignsPage />} />
              <Route path="/subscribe" element={<SubscriptionPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DesignsProvider>
    </AuthProvider>
  )
}
