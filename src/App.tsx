import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import History from './pages/History'
import AdminDashboard from './pages/admin/Dashboard'
import AdminGames from './pages/admin/Games'
import AdminTransactions from './pages/admin/Transactions'
import AdminUsers from './pages/admin/Users'
import AdminSettings from './pages/admin/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/games" element={<Games />} />
      <Route path="/games/:slug" element={<GameDetail />} />
      <Route path="/history" element={<History />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/games" element={<AdminGames />} />
      <Route path="/admin/transactions" element={<AdminTransactions />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
