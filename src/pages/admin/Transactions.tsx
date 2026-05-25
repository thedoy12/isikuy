import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination } from "@/components/admin/TablePagination";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import BrandLogo from "@/components/BrandLogo";
import {
  Receipt,
  Bell,
  Gamepad2,
  BarChart3,
  Users,
  ArrowLeft,
  Loader2,
  Zap,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Settings,
  Tags,
  Wand2,
} from "lucide-react";

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

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-[#ffb800]", label: "PENDING" },
  processing: { icon: Loader2, color: "text-[#00f0ff]", label: "PROCESSING" },
  success: { icon: CheckCircle2, color: "text-[#0aff00]", label: "SUCCESS" },
  failed: { icon: XCircle, color: "text-[#ff003c]", label: "FAILED" },
  cancelled: { icon: XCircle, color: "text-white/30", label: "CANCELLED" },
  refunded: { icon: AlertCircle, color: "text-[#ffb800]", label: "REFUNDED" },
};

function displayStatus(tx: any) {
  if (tx.paymentStatus === "paid" && tx.status === "failed") {
    return {
      icon: AlertCircle,
      color: "text-[#ffb800]",
      label: "PAID_NEEDS_HELP",
    };
  }
  return statusConfig[tx.status] || { icon: AlertCircle, color: "text-white/30", label: tx.status };
}

export default function AdminTransactions() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { data: txList } = trpc.admin.transactions.useQuery(
    {
      status: statusFilter || undefined,
      limit: pageSize,
      offset: page * pageSize,
    },
    { enabled: isAdmin }
  );
  const updateTx = trpc.admin.updateTransaction.useMutation({
    onSuccess: () => utils.admin.transactions.invalidate(),
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  if (authLoading) {
    return <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#ff003c] animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex font-terminal">
      <AdminSidebar active="transactions" />
      <AdminMobileNav active="transactions" />
      <main className="flex-1 min-w-0">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <p className="text-[10px] text-[#00f0ff] tracking-wider">FINANCIALS // TRANSACTION_LOG</p>
            <div className="flex flex-wrap items-center gap-2">
              {["", "pending", "processing", "success", "failed"].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-[9px] px-2 py-1 rounded tracking-wider transition-colors ${
                    statusFilter === s ? "bg-[#ff003c] text-white" : "text-white/30 hover:text-white"
                  }`}>
                  {s.toUpperCase() || "ALL"}
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className="p-4 pb-24 sm:p-6 lg:pb-6">
          <div className="border border-[#222] bg-[#11131a]">
            <div className="grid gap-3 p-3 xl:hidden">
              {txList?.items.map((tx: any) => {
                const sc = displayStatus(tx);
                const StatusIcon = sc.icon;
                return (
                  <article key={tx.id} className="border border-[#222] bg-[#0b0d14] p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-all text-[11px] text-[#00f0ff]">{tx.invoiceNumber}</p>
                        <p className="mt-1 text-sm font-bold text-white">{tx.gameName || "-"}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
                          PAYMENT: {tx.paymentStatus || "-"}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
                          SUPPLIER: {tx.supplierProvider || "-"}
                        </p>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 text-[10px] ${sc.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </div>
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <p className="text-[9px] text-white/30">PRODUCT</p>
                        <p className="mt-1 text-white/65">{tx.productName || "-"}</p>
                        <p className="mt-1 break-all text-[10px] text-white/30">{tx.providerProductCode || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-white/30">PLAYER</p>
                        <p className="mt-1 break-all text-white/65">{tx.playerId || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-white/30">AMOUNT</p>
                        <p className="mt-1 text-[#ff003c]">Rp{parseFloat(tx.totalAmount).toLocaleString()}</p>
                      </div>
                    </div>
                    {tx.issue && (
                      <div className="mt-3 border border-[#ffb800]/20 bg-[#ffb800]/5 p-3 text-[10px] leading-relaxed text-[#ffb800]">
                        {tx.issue}
                      </div>
                    )}
                    {(tx.status === "pending" || tx.status === "processing") && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {tx.status === "pending" && (
                          <>
                            <button onClick={() => updateTx.mutate({ id: tx.id, status: "processing" })}
                              className="px-3 py-2 text-[10px] bg-[#00f0ff]/10 text-[#00f0ff] rounded hover:bg-[#00f0ff]/20 transition-colors">
                              PROCESS
                            </button>
                            <button onClick={() => updateTx.mutate({ id: tx.id, status: "failed" })}
                              className="px-3 py-2 text-[10px] bg-[#ff003c]/10 text-[#ff003c] rounded hover:bg-[#ff003c]/20 transition-colors">
                              FAIL
                            </button>
                          </>
                        )}
                        {tx.status === "processing" && (
                          <button onClick={() => updateTx.mutate({ id: tx.id, status: "success" })}
                            className="px-3 py-2 text-[10px] bg-[#0aff00]/10 text-[#0aff00] rounded hover:bg-[#0aff00]/20 transition-colors">
                            COMPLETE
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto xl:block">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#ff003c]">
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">INVOICE</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">GAME</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">PRODUCT</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">PLAYER</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">AMOUNT</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">STATUS</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">PAYMENT</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">SUPPLIER</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#e1f5fe]/40 tracking-wider font-normal">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {txList?.items.map((tx: any) => {
                  const sc = displayStatus(tx);
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={tx.id} className="border-b border-[#222] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-[10px] text-[#00f0ff]">{tx.invoiceNumber}</td>
                      <td className="px-4 py-3 text-xs text-white">{tx.gameName}</td>
                      <td className="px-4 py-3 text-[10px] text-white/50">
                        <p>{tx.productName}</p>
                        <p className="mt-1 break-all text-white/25">{tx.providerProductCode || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-white/50">{tx.playerId}</td>
                      <td className="px-4 py-3 text-xs text-[#ff003c]">Rp{parseFloat(tx.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className={`flex items-center gap-1 text-[10px] ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </span>
                          {tx.issue && (
                            <p className="mt-1 max-w-64 text-[9px] leading-relaxed text-[#ffb800]/80">
                              {tx.issue}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] uppercase text-white/45">
                        {tx.paymentStatus || "-"}
                      </td>
                      <td className="px-4 py-3 text-[10px] uppercase text-white/45">
                        <p>{tx.supplierProvider || "-"}</p>
                        <p className="mt-1 break-all text-white/25">{tx.providerReference || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {tx.status === "pending" && (
                          <div className="flex gap-1">
                            <button onClick={() => updateTx.mutate({ id: tx.id, status: "processing" })}
                              className="text-[9px] px-2 py-1 bg-[#00f0ff]/10 text-[#00f0ff] rounded hover:bg-[#00f0ff]/20 transition-colors">
                              PROCESS
                            </button>
                            <button onClick={() => updateTx.mutate({ id: tx.id, status: "failed" })}
                              className="text-[9px] px-2 py-1 bg-[#ff003c]/10 text-[#ff003c] rounded hover:bg-[#ff003c]/20 transition-colors">
                              FAIL
                            </button>
                          </div>
                        )}
                        {tx.status === "processing" && (
                          <button onClick={() => updateTx.mutate({ id: tx.id, status: "success" })}
                            className="text-[9px] px-2 py-1 bg-[#0aff00]/10 text-[#0aff00] rounded hover:bg-[#0aff00]/20 transition-colors">
                            COMPLETE
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={txList?.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}


