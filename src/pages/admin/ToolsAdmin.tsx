import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { BarChart3, Bell, Gamepad2, Receipt, Settings,
  Tags, Users, Wand2, ArrowLeft, Zap, Loader2 } from "lucide-react";
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
        <p className="text-[9px] text-white/20 font-terminal tracking-wider px-3 mb-2">NAVIGATION</p>
        {navItems.map((item) => (
          <Link key={item.id} to={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-terminal tracking-wider transition-colors ${
              active === item.id
                ? "text-[#00f0ff] bg-white/5 border-l-2 border-[#ff003c]"
                : "text-[#e1f5fe]/40 hover:text-white hover:bg-white/[0.02]"
            }`}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-[#222]">
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-terminal text-[#ff003c]/60 hover:text-[#ff003c] tracking-wider transition-colors w-full">
          <Zap className="w-4 h-4" />
          LOGOUT
        </button>
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 text-sm font-terminal text-[#e1f5fe]/20 hover:text-[#e1f5fe]/40 tracking-wider transition-colors">
          <ArrowLeft className="w-4 h-4" />
          BACK_TO_SITE
        </Link>
      </div>
    </aside>
  );
}

export default function AdminTools() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const { data: tools } = trpc.tools.list.useQuery(undefined, { enabled: isAdmin });
  const { data: stats } = trpc.tools.adminStats.useQuery(undefined, { enabled: isAdmin });
  const toggleTool = trpc.tools.adminToggle.useMutation({
    onSuccess: () => utils.tools.list.invalidate(),
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  if (authLoading) {
    return <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#ff003c] animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  const usageBySlug = new Map((stats || []).map((item) => [item.toolSlug, item.total]));

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex font-terminal">
      <AdminSidebar active="tools" />
      <AdminMobileNav active="tools" />
      <main className="flex-1 min-w-0">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <p className="text-[10px] text-[#00f0ff] tracking-wider">TOOLS // FUN_TOOLS_ANALYTICS</p>
        </header>
        <div className="p-4 pb-24 sm:p-6 lg:pb-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools?.map((tool) => (
              <article key={tool.slug} className="border border-[#222] bg-[#11131a] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-[#00f0ff]">{tool.category}</p>
                    <h2 className="mt-2 font-display text-xl font-bold text-white">{tool.title}</h2>
                    <p className="mt-2 text-xs leading-relaxed text-white/45">{tool.description}</p>
                  </div>
                  <button
                    onClick={() => toggleTool.mutate({ slug: tool.slug, isActive: !tool.isActive })}
                    className={`w-full shrink-0 rounded px-3 py-2 text-[10px] sm:w-auto ${tool.isActive ? "bg-[#0aff00]/10 text-[#0aff00]" : "bg-[#ff003c]/10 text-[#ff003c]"}`}
                  >
                    {tool.isActive ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#222] pt-4 text-xs">
                  <span className="text-white/35">Usage</span>
                  <span className="text-[#ffb800]">{usageBySlug.get(tool.slug) || 0}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


