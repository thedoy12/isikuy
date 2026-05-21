import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router'
import SiteMeta from './components/SiteMeta'
import SitePopup from './components/SitePopup'
import ToolsPromoPopup from './components/ToolsPromoPopup'
import PendingPaymentResume from './components/PendingPaymentResume'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Games = lazy(() => import('./pages/Games'))
const GameDetail = lazy(() => import('./pages/GameDetail'))
const History = lazy(() => import('./pages/History'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))
const Payment = lazy(() => import('./pages/Payment'))
const InfoPage = lazy(() => import('./pages/InfoPage'))
const Tools = lazy(() => import('./pages/Tools'))
const ToolDetail = lazy(() => import('./pages/ToolDetail'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminGames = lazy(() => import('./pages/admin/Games'))
const AdminTransactions = lazy(() => import('./pages/admin/Transactions'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminUserEdit = lazy(() => import('./pages/admin/UserEdit'))
const AdminVouchers = lazy(() => import('./pages/admin/Vouchers'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const AdminTools = lazy(() => import('./pages/admin/ToolsAdmin'))
const AdminToolsMonitor = lazy(() => import('./pages/admin/ToolsMonitor'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return <div className="min-h-[100dvh] site-bg" />
}

function DeferredSiteOverlays() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const show = () => setReady(true)
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(show, { timeout: 2000 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timer = setTimeout(show, 1200)
    return () => clearTimeout(timer)
  }, [])

  if (!ready) return null

  return (
    <>
      <SitePopup />
      <ToolsPromoPopup />
    </>
  )
}

export default function App() {
  return (
    <>
      <SiteMeta />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:slug" element={<GameDetail />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/:slug" element={<ToolDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/payment/:invoiceNumber" element={<Payment />} />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="/tentang" element={<InfoPage />} />
          <Route path="/kontak" element={<InfoPage />} />
          <Route path="/bantuan" element={<InfoPage />} />
          <Route path="/privacy" element={<InfoPage />} />
          <Route path="/terms" element={<InfoPage />} />
          <Route path="/refund" element={<InfoPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/games" element={<AdminGames />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:id" element={<AdminUserEdit />} />
          <Route path="/admin/vouchers" element={<AdminVouchers />} />
          <Route path="/admin/tools" element={<AdminTools />} />
          <Route path="/admin/tools-monitor" element={<AdminToolsMonitor />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <PendingPaymentResume />
      <DeferredSiteOverlays />
    </>
  )
}
