import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import History from './pages/History'
import InfoPage from './pages/InfoPage'
import AdminDashboard from './pages/admin/Dashboard'
import AdminGames from './pages/admin/Games'
import AdminTransactions from './pages/admin/Transactions'
import AdminUsers from './pages/admin/Users'
import AdminUserEdit from './pages/admin/UserEdit'
import AdminSettings from './pages/admin/Settings'
import NotFound from './pages/NotFound'
import SiteMeta from './components/SiteMeta'
import SitePopup from './components/SitePopup'

export default function App() {
  return (
    <>
      <SiteMeta />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/:slug" element={<GameDetail />} />
        <Route path="/history" element={<History />} />
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
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SitePopup />
    </>
  )
}
