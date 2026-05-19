import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { TablePagination } from "@/components/admin/TablePagination";
import BrandLogo from "@/components/BrandLogo";
import {
  Users,
  Bell,
  Gamepad2,
  Receipt,
  TrendingUp,
  Clock,
  Activity,
  Zap,
  BarChart3,
  ArrowLeft,
  Loader2,
  Settings,
  Tags,
  Wand2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// ─── CRT Scanline Overlay ───
function ScanlineOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03]"
      style={{
        background:
          "linear-gradient(0deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,60,0.06), rgba(0,240,255,0.02), rgba(255,0,60,0.06))",
        backgroundSize: "100% 4px, 3px 100%",
      }}
    />
  );
}

// ─── Stat Card ───
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="border border-[#222] bg-[#11131a] p-5 group hover:border-[#ff003c]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <Activity className="w-4 h-4 text-white/10" />
      </div>
      <p className="font-terminal text-2xl text-white font-bold">{value}</p>
      <p className="text-xs text-[#e1f5fe]/40 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-[#00f0ff] mt-1">{sub}</p>}
    </div>
  );
}

// ─── Sidebar ───
function AdminSidebar({ active }: { active: string }) {
  const { logout } = useAuth();
  const navItems = [
    { id: "dashboard", label: "CONSOLE", icon: BarChart3, href: "/admin" },
    { id: "games", label: "ARSENAL", icon: Gamepad2, href: "/admin/games" },
    { id: "transactions", label: "FINANCIALS", icon: Receipt, href: "/admin/transactions" },
    { id: "users", label: "INTEL", icon: Users, href: "/admin/users" },
    { id: "vouchers", label: "VOUCHERS", icon: Tags, href: "/admin/vouchers" },
    { id: "tools", label: "TOOLS", icon: Wand2, href: "/admin/tools" },
    { id: "tools-monitor", label: "TOOLS_MONITOR", icon: Bell, href: "/admin/tools-monitor" },
    { id: "settings", label: "SETTINGS", icon: Settings, href: "/admin/settings" },
  ];

  return (
    <aside className="w-64 bg-[#0b0d14] border-r border-[#222] flex-shrink-0 hidden lg:flex flex-col">
      <div className="p-5 border-b border-[#222]">
        <BrandLogo consoleLabel imageClassName="h-10" />
      </div>

      <nav className="flex-1 p-3">
        <p className="text-[9px] text-white/20 font-terminal tracking-wider px-3 mb-2">
          NAVIGATION
        </p>
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-terminal tracking-wider transition-colors ${
              active === item.id
                ? "text-[#00f0ff] bg-white/5 border-l-2 border-[#ff003c]"
                : "text-[#e1f5fe]/40 hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-[#222]">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-terminal text-[#ff003c]/60 hover:text-[#ff003c] tracking-wider transition-colors w-full"
        >
          <Zap className="w-4 h-4" />
          LOGOUT
        </button>
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-terminal text-[#e1f5fe]/20 hover:text-[#e1f5fe]/40 tracking-wider transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK_TO_SITE
        </Link>
      </div>
    </aside>
  );
}

// ─── Main Dashboard ───
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [recentPage, setRecentPage] = useState(0);
  const recentPageSize = 8;

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const { data: recentTx } = trpc.admin.transactions.useQuery(
    { limit: recentPageSize, offset: recentPage * recentPageSize },
    { enabled: isAdmin }
  );

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff003c] animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;
  const chartData = stats?.dailyRevenue ?? [];

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex font-terminal">
      <ScanlineOverlay />
      <AdminSidebar active="dashboard" />
      <AdminMobileNav active="dashboard" />

      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#00f0ff] tracking-wider">
                GLOBAL_COMMAND // DASHBOARD
              </p>
              <p className="text-[9px] text-[#e1f5fe]/30 tracking-wider mt-1">
                ACTIVE_NODES: {stats?.totalUsers?.toLocaleString() || "0"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0aff00] animate-pulse" />
                <span className="text-[10px] text-[#0aff00]">SYSTEM.ONLINE</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 pb-24 sm:p-6 lg:pb-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Receipt}
              label="TOTAL REVENUE"
              value={statsLoading ? "..." : `Rp${(stats?.todayRevenue || 0).toLocaleString()}`}
              sub="Today"
              color="#ff003c"
            />
            <StatCard
              icon={Clock}
              label="PENDING TX"
              value={statsLoading ? "..." : stats?.pendingTransactions || 0}
              color="#ffb800"
            />
            <StatCard
              icon={Users}
              label="TOTAL USERS"
              value={statsLoading ? "..." : stats?.totalUsers || 0}
              color="#00f0ff"
            />
            <StatCard
              icon={TrendingUp}
              label="SUCCESS RATE"
              value={
                statsLoading
                  ? "..."
                  : `${
                      stats?.totalTransactions
                        ? Math.round(
                            ((stats?.successTransactions || 0) /
                              stats.totalTransactions) *
                              100
                          )
                        : 0
                    }%`
              }
              color="#0aff00"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="border border-[#222] bg-[#11131a] p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-terminal text-sm text-white tracking-wider">
                  REVENUE_STREAMS // 7 DAYS
                </h3>
                <TrendingUp className="w-4 h-4 text-[#ff003c]" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff003c" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ff003c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis
                    dataKey="name"
                    stroke="#444"
                    tick={{ fill: "#666", fontSize: 10, fontFamily: "Share Tech Mono" }}
                  />
                  <YAxis
                    stroke="#444"
                    tick={{ fill: "#666", fontSize: 10, fontFamily: "Share Tech Mono" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#11131a",
                      border: "1px solid #222",
                      fontFamily: "Share Tech Mono",
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "#00f0ff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#ff003c"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Profit Chart */}
            <div className="border border-[#222] bg-[#11131a] p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-terminal text-sm text-white tracking-wider">
                  PROFIT_ANALYSIS // 7 DAYS
                </h3>
                <BarChart3 className="w-4 h-4 text-[#00f0ff]" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis
                    dataKey="name"
                    stroke="#444"
                    tick={{ fill: "#666", fontSize: 10, fontFamily: "Share Tech Mono" }}
                  />
                  <YAxis
                    stroke="#444"
                    tick={{ fill: "#666", fontSize: 10, fontFamily: "Share Tech Mono" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#11131a",
                      border: "1px solid #222",
                      fontFamily: "Share Tech Mono",
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "#00f0ff" }}
                  />
                  <Bar dataKey="profit" fill="#00f0ff" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="sales" fill="#ff003c" radius={[2, 2, 0, 0]} opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="border border-[#222] bg-[#11131a]">
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-[#222]">
              <h3 className="font-terminal text-sm text-white tracking-wider">
                RECENT_TRANSACTIONS
              </h3>
              <Link
                to="/admin/transactions"
                className="text-[10px] text-[#00f0ff] hover:underline tracking-wider"
              >
                VIEW_ALL &rarr;
              </Link>
            </div>
            <div className="grid gap-3 p-3 xl:hidden">
              {recentTx?.items.map((tx: any) => (
                <article key={tx.id} className="border border-[#222] bg-[#0b0d14] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all text-[11px] text-[#00f0ff]">{tx.invoiceNumber}</p>
                      <p className="mt-1 text-sm font-bold text-white">{tx.gameName || "-"}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-terminal tracking-wider ${
                        tx.status === "success"
                          ? "text-[#0aff00]"
                          : tx.status === "pending"
                          ? "text-[#ffb800]"
                          : tx.status === "processing"
                          ? "text-[#00f0ff]"
                          : "text-[#ff003c]"
                      }`}
                    >
                      {tx.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[9px] text-white/30">AMOUNT</p>
                      <p className="mt-1 text-[#ff003c]">Rp{parseFloat(tx.totalAmount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/30">DATE</p>
                      <p className="mt-1 text-white/45">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("id-ID") : "-"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#ff003c]">
                    <th className="text-left px-5 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">
                      INVOICE
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">
                      GAME
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">
                      AMOUNT
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">
                      STATUS
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">
                      DATE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx?.items.map((tx: any) => (
                    <tr
                      key={tx.id}
                      className="border-b border-[#222] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3 text-xs text-[#00f0ff]">
                        {tx.invoiceNumber}
                      </td>
                      <td className="px-5 py-3 text-xs text-white">
                        {tx.gameName}
                      </td>
                      <td className="px-5 py-3 text-xs text-[#ff003c]">
                        Rp{parseFloat(tx.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-[10px] font-terminal tracking-wider ${
                            tx.status === "success"
                              ? "text-[#0aff00]"
                              : tx.status === "pending"
                              ? "text-[#ffb800]"
                              : tx.status === "processing"
                              ? "text-[#00f0ff]"
                              : "text-[#ff003c]"
                          }`}
                        >
                          {tx.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[10px] text-white/30">
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={recentPage}
              pageSize={recentPageSize}
              total={recentTx?.total ?? 0}
              onPageChange={setRecentPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
