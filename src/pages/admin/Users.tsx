import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination } from "@/components/admin/TablePagination";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import BrandLogo from "@/components/BrandLogo";
import {
  Users,
  Shield,
  Gamepad2,
  BarChart3,
  Receipt,
  ArrowLeft,
  Loader2,
  Zap,
  UserCheck,
  UserX,
  Crown,
  Pencil,
  Settings,
} from "lucide-react";

function AdminSidebar({ active }: { active: string }) {
  const { logout } = useAuth();
  const navItems = [
    { id: "dashboard", label: "CONSOLE", icon: BarChart3, href: "/admin" },
    { id: "games", label: "ARSENAL", icon: Gamepad2, href: "/admin/games" },
    { id: "transactions", label: "FINANCIALS", icon: Receipt, href: "/admin/transactions" },
    { id: "users", label: "INTEL", icon: Users, href: "/admin/users" },
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

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { data: userList } = trpc.admin.users.useQuery(
    { limit: pageSize, offset: page * pageSize },
    { enabled: isAdmin }
  );
  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: () => utils.admin.users.invalidate(),
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
      <AdminSidebar active="users" />
      <AdminMobileNav active="users" />
      <main className="flex-1 min-w-0">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-6 py-4">
          <p className="text-[10px] text-[#00f0ff] tracking-wider">INTEL // USER_MANAGEMENT</p>
        </header>
        <div className="p-6 pb-24 lg:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border border-[#222] bg-[#11131a] p-4">
              <p className="text-[10px] text-white/30 tracking-wider mb-1">TOTAL_USERS</p>
              <p className="text-2xl text-white font-bold">{userList?.total || 0}</p>
            </div>
            <div className="border border-[#222] bg-[#11131a] p-4">
              <p className="text-[10px] text-white/30 tracking-wider mb-1">ADMIN_COUNT</p>
              <p className="text-2xl text-[#ff003c] font-bold">
                {userList?.adminCount || 0}
              </p>
            </div>
            <div className="border border-[#222] bg-[#11131a] p-4">
              <p className="text-[10px] text-white/30 tracking-wider mb-1">ACTIVE</p>
              <p className="text-2xl text-[#0aff00] font-bold">
                {userList?.activeCount || 0}
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-[#222] bg-[#11131a] overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#ff003c]">
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">USER</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">EMAIL</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">ROLE</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">BALANCE</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">STATUS</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">JOINED</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {userList?.items.map((u: any) => (
                  <tr key={u.id} className="border-b border-[#222] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#ff003c]/10 flex items-center justify-center">
                            <span className="text-xs text-[#ff003c] font-bold">
                              {(u.name || "U")[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-white">{u.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-white/50">{u.email || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-[10px] ${
                        u.role === "superadmin" ? "text-[#ff003c]" :
                        u.role === "admin" ? "text-[#ffb800]" : "text-white/40"
                      }`}>
                        {u.role === "superadmin" ? <Crown className="w-3 h-3" /> :
                         u.role === "admin" ? <Shield className="w-3 h-3" /> :
                         <Users className="w-3 h-3" />}
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#00f0ff]">
                      Rp{parseFloat(u.balance || "0").toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => updateUser.mutate({ id: u.id, isActive: !u.isActive })}
                        className={`text-xs ${u.isActive ? "text-[#0aff00]" : "text-[#ff003c]"}`}>
                        {u.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-white/30">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="inline-flex items-center gap-1 rounded bg-[#00f0ff]/10 px-2 py-1 text-[9px] text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/20"
                        >
                          <Pencil className="h-3 w-3" />
                          EDIT
                        </Link>
                        {u.role === "user" && (
                          <button onClick={() => updateUser.mutate({ id: u.id, role: "admin" })}
                            className="text-[9px] px-2 py-1 bg-[#ffb800]/10 text-[#ffb800] rounded hover:bg-[#ffb800]/20 transition-colors">
                            PROMOTE
                          </button>
                        )}
                        {(u.role === "admin" || u.role === "superadmin") && u.id !== user?.id && (
                          <button onClick={() => updateUser.mutate({ id: u.id, role: "user" })}
                            className="text-[9px] px-2 py-1 bg-white/5 text-white/40 rounded hover:bg-white/10 transition-colors">
                            DEMOTE
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={userList?.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
