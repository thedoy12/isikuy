import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination } from "@/components/admin/TablePagination";
import {
  Gamepad2,
  Shield,
  TrendingUp,
  Star,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  BarChart3,
  Receipt,
  Users,
  Zap,
} from "lucide-react";

function AdminSidebar({ active }: { active: string }) {
  const { logout } = useAuth();
  const navItems = [
    { id: "dashboard", label: "CONSOLE", icon: BarChart3, href: "/admin" },
    { id: "games", label: "ARSENAL", icon: Gamepad2, href: "/admin/games" },
    { id: "transactions", label: "FINANCIALS", icon: Receipt, href: "/admin/transactions" },
    { id: "users", label: "INTEL", icon: Users, href: "/admin/users" },
  ];

  return (
    <aside className="w-64 bg-[#0b0d14] border-r border-[#222] flex-shrink-0 hidden lg:flex flex-col">
      <div className="p-5 border-b border-[#222]">
        <Link to="/" className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#ff003c]" />
          <div>
            <p className="font-terminal text-sm text-white tracking-wider">ISIKUY_INTEL</p>
            <p className="text-[9px] text-[#00f0ff] tracking-wider">OPERATOR_CONSOLE</p>
          </div>
        </Link>
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
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-terminal text-[#ff003c]/60 hover:text-[#ff003c] tracking-wider transition-colors w-full">
          <Zap className="w-4 h-4" />
          LOGOUT
        </button>
        <Link to="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-terminal text-[#e1f5fe]/20 hover:text-[#e1f5fe]/40 tracking-wider transition-colors">
          <ArrowLeft className="w-4 h-4" />
          BACK_TO_SITE
        </Link>
      </div>
    </aside>
  );
}

export default function AdminGames() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: gamesList } = trpc.admin.games.useQuery(
    { limit: pageSize, offset: page * pageSize },
    { enabled: isAdmin },
  );
  const updateGame = trpc.admin.updateGame.useMutation({
    onSuccess: () => utils.admin.games.invalidate(),
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  if (authLoading) {
    return <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#ff003c] animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex font-terminal">
      <AdminSidebar active="games" />
      <main className="flex-1 min-w-0">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-6 py-4">
          <p className="text-[10px] text-[#00f0ff] tracking-wider">ARSENAL // GAME_MANAGEMENT</p>
        </header>
        <div className="p-6">
          <div className="border border-[#222] bg-[#11131a] overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#ff003c]">
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">GAME</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">CATEGORY</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">PLATFORM</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">TRENDING</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">POPULAR</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">NEW</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">ACTIVE</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {gamesList?.items.map((g: any) => (
                  <tr key={g.id} className="border-b border-[#222] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {g.coverImage && (
                          <img src={g.coverImage} alt={g.name} className="w-8 h-8 rounded object-cover" />
                        )}
                        <span className="text-xs text-white">{g.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">{g.categoryName}</td>
                    <td className="px-4 py-3 text-[10px] text-white/40 uppercase">{g.platform}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => updateGame.mutate({ id: g.id, isTrending: !g.isTrending })}
                        className={`text-xs ${g.isTrending ? "text-[#ff003c]" : "text-white/20"}`}>
                        <TrendingUp className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => updateGame.mutate({ id: g.id, isPopular: !g.isPopular })}
                        className={`text-xs ${g.isPopular ? "text-[#ffb800]" : "text-white/20"}`}>
                        <Star className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => updateGame.mutate({ id: g.id, isNew: !g.isNew })}
                        className={`text-xs ${g.isNew ? "text-[#00f0ff]" : "text-white/20"}`}>
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => updateGame.mutate({ id: g.id, isActive: !g.isActive })}
                        className={`text-xs ${g.isActive ? "text-[#0aff00]" : "text-[#ff003c]"}`}>
                        {g.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/games/${g.slug}`} target="_blank"
                        className="text-[10px] text-[#00f0ff] hover:underline">VIEW</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={gamesList?.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
