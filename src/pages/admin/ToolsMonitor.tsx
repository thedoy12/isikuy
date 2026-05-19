import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  CheckCircle2,
  Gamepad2,
  Loader2,
  Receipt,
  Settings,
  ShieldAlert,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

function AdminSidebar({ active }: { active: string }) {
  const { logout } = useAuth();
  const navItems = [
    { id: "dashboard", label: "CONSOLE", icon: BarChart3, href: "/admin" },
    { id: "games", label: "ARSENAL", icon: Gamepad2, href: "/admin/games" },
    { id: "transactions", label: "FINANCIALS", icon: Receipt, href: "/admin/transactions" },
    { id: "users", label: "INTEL", icon: Users, href: "/admin/users" },
    { id: "tools", label: "TOOLS", icon: Wand2, href: "/admin/tools" },
    { id: "tools-monitor", label: "TOOLS_MONITOR", icon: Bell, href: "/admin/tools-monitor" },
    { id: "settings", label: "SETTINGS", icon: Settings, href: "/admin/settings" },
  ];

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-[#222] bg-[#0b0d14] lg:flex">
      <div className="border-b border-[#222] p-5">
        <BrandLogo consoleLabel imageClassName="h-10" />
      </div>
      <nav className="flex-1 p-3">
        <p className="mb-2 px-3 font-terminal text-[9px] tracking-wider text-white/20">NAVIGATION</p>
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider transition-colors ${
              active === item.id
                ? "border-l-2 border-[#ff003c] bg-white/5 text-[#00f0ff]"
                : "text-[#e1f5fe]/40 hover:bg-white/[0.02] hover:text-white"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[#222] p-3">
        <button onClick={logout} className="flex w-full items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider text-[#ff003c]/60 transition-colors hover:text-[#ff003c]">
          <Zap className="h-4 w-4" />
          LOGOUT
        </button>
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider text-[#e1f5fe]/20 transition-colors hover:text-[#e1f5fe]/40">
          <ArrowLeft className="h-4 w-4" />
          BACK_TO_SITE
        </Link>
      </div>
    </aside>
  );
}

export default function AdminToolsMonitor() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [message, setMessage] = useState("Tools sedang maintenance. Coba lagi nanti.");

  const { data: monitor, isLoading } = trpc.tools.adminMonitor.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  const setMaintenance = trpc.tools.adminSetMaintenance.useMutation({
    onSuccess: () => {
      utils.tools.adminMonitor.invalidate();
      utils.tools.status.invalidate();
    },
  });
  const resolveAlert = trpc.tools.adminResolveAlert.useMutation({
    onSuccess: () => utils.tools.adminMonitor.invalidate(),
  });
  const testGemini = trpc.tools.adminTestGemini.useMutation({
    onSuccess: () => utils.tools.adminMonitor.invalidate(),
    onError: () => utils.tools.adminMonitor.invalidate(),
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (monitor?.maintenance.message) setMessage(monitor.maintenance.message);
  }, [monitor?.maintenance.message]);

  if (authLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#030305]"><Loader2 className="h-8 w-8 animate-spin text-[#ff003c]" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="flex min-h-[100dvh] bg-[#030305] font-terminal text-white">
      <AdminSidebar active="tools-monitor" />
      <AdminMobileNav active="tools-monitor" />
      <main className="min-w-0 flex-1">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <p className="text-[10px] tracking-wider text-[#00f0ff]">TOOLS // GEMINI_MONITOR</p>
        </header>

        <div className="p-4 pb-24 sm:p-6 lg:pb-6">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff003c]" />
            </div>
          ) : (
            <div className="grid gap-5">
              <section className="grid gap-4 md:grid-cols-4">
                <div className="border border-[#222] bg-[#11131a] p-5">
                  <p className="text-[10px] text-white/35">MAINTENANCE</p>
                  <p className={monitor?.maintenance.enabled ? "mt-2 text-2xl font-bold text-[#ffb800]" : "mt-2 text-2xl font-bold text-[#0aff00]"}>
                    {monitor?.maintenance.enabled ? "ON" : "OFF"}
                  </p>
                </div>
                <div className="border border-[#222] bg-[#11131a] p-5">
                  <p className="text-[10px] text-white/35">OPEN_ALERTS</p>
                  <p className="mt-2 text-2xl font-bold text-[#ff4967]">{monitor?.openAlerts || 0}</p>
                </div>
                <div className="border border-[#222] bg-[#11131a] p-5">
                  <p className="text-[10px] text-white/35">GENERATES</p>
                  <p className="mt-2 text-2xl font-bold text-white">{monitor?.totalGenerates || 0}</p>
                </div>
                <div className="border border-[#222] bg-[#11131a] p-5">
                  <p className="text-[10px] text-white/35">GEMINI_SOURCE</p>
                  <p className="mt-2 text-2xl font-bold text-[#00f0ff]">{monitor?.geminiGenerates || 0}</p>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
                <div className="border border-[#222] bg-[#11131a] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-[#ffb800]" />
                    <h2 className="font-display text-xl font-bold">TOOLS_MAINTENANCE</h2>
                  </div>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="min-h-28 w-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setMaintenance.mutate({ enabled: true, message })}
                      disabled={setMaintenance.isPending}
                      className="flex items-center justify-center gap-2 bg-[#ffb800] px-4 py-3 text-sm font-bold text-black disabled:opacity-60"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      TUTUP_TOOLS
                    </button>
                    <button
                      onClick={() => setMaintenance.mutate({ enabled: false, message })}
                      disabled={setMaintenance.isPending}
                      className="flex items-center justify-center gap-2 bg-[#0aff00] px-4 py-3 text-sm font-bold text-black disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      BUKA_TOOLS
                    </button>
                  </div>
                  <button
                    onClick={() => testGemini.mutate()}
                    disabled={testGemini.isPending}
                    className="mt-3 flex w-full items-center justify-center gap-2 border border-[#00f0ff]/25 bg-[#00f0ff]/10 px-4 py-3 text-sm font-bold text-[#00f0ff] disabled:opacity-60"
                  >
                    {testGemini.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    TEST_GEMINI
                  </button>
                  {testGemini.error && <p className="mt-3 text-xs text-[#ff4967]">{testGemini.error.message}</p>}
                  {testGemini.data && <p className="mt-3 text-xs text-[#0aff00]">Gemini OK: {testGemini.data.result}</p>}
                </div>

                <div className="border border-[#222] bg-[#11131a] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Bell className="h-5 w-5 text-[#ff4967]" />
                    <h2 className="font-display text-xl font-bold">GEMINI_ALERTS</h2>
                  </div>
                  <div className="grid gap-3">
                    {monitor?.latestAlerts.length ? monitor.latestAlerts.map((alert) => (
                      <article key={alert.id} className={`border p-4 ${alert.isResolved ? "border-white/10 bg-black/20" : "border-[#ff003c]/25 bg-[#27050c]/45"}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] text-white/35">{new Date(alert.createdAt).toLocaleString("id-ID")}</p>
                            <p className="mt-1 text-sm text-white">{alert.toolSlug || "system"} {alert.model ? `// ${alert.model}` : ""} {alert.statusCode ? `// ${alert.statusCode}` : ""}</p>
                          </div>
                          {!alert.isResolved && (
                            <button
                              onClick={() => resolveAlert.mutate({ id: alert.id })}
                              className="shrink-0 border border-[#0aff00]/25 px-3 py-2 text-[10px] text-[#0aff00]"
                            >
                              RESOLVE
                            </button>
                          )}
                        </div>
                        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-white/50">{alert.message}</p>
                      </article>
                    )) : (
                      <p className="border border-white/10 bg-black/20 p-4 text-sm text-white/45">Belum ada alert Gemini.</p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
