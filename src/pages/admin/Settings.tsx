import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  Lock,
  Receipt,
  Settings,
  Shield,
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
    { id: "settings", label: "SETTINGS", icon: Settings, href: "/admin/settings" },
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

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const utils = trpc.useUtils();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: settings } = trpc.admin.settings.useQuery(undefined, {
    enabled: isAdmin,
  });
  const updatePassword = trpc.admin.updateAdminPassword.useMutation({
    onSuccess: async () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setMessage("Password admin berhasil diperbarui");
      await utils.admin.settings.invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama");
      return;
    }

    updatePassword.mutate({ currentPassword, newPassword });
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff003c] animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex font-terminal">
      <AdminSidebar active="settings" />
      <AdminMobileNav active="settings" />
      <main className="flex-1 min-w-0">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-6 py-4">
          <p className="text-[10px] text-[#00f0ff] tracking-wider">
            SETTINGS // ACCESS_CONTROL
          </p>
        </header>

        <div className="p-6 pb-24 lg:pb-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="border border-[#222] bg-[#11131a] p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#ff003c]/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#ff003c]" />
                </div>
                <div>
                  <h1 className="text-lg text-white font-bold tracking-wider">
                    ADMIN_PASSWORD
                  </h1>
                  <p className="text-[10px] text-white/35 tracking-wider">
                    Ubah password login panel admin
                  </p>
                </div>
              </div>

              <form onSubmit={submitPassword} className="space-y-5 max-w-xl">
                <div>
                  <label className="block text-[10px] text-white/40 tracking-wider mb-2">
                    USERNAME
                  </label>
                  <input
                    type="text"
                    value={settings?.adminUsername || ""}
                    readOnly
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white/60 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 tracking-wider mb-2">
                    PASSWORD_LAMA
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-white/40 tracking-wider mb-2">
                      PASSWORD_BARU
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={8}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 tracking-wider mb-2">
                      KONFIRMASI
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      minLength={8}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-white/45">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(event) => setShowPasswords(event.target.checked)}
                    className="accent-[#00f0ff]"
                  />
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Tampilkan password
                </label>

                {message && (
                  <div className="flex items-center gap-2 border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-xs text-[#0aff00]">
                    <CheckCircle2 className="w-4 h-4" />
                    {message}
                  </div>
                )}
                {error && (
                  <div className="border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-xs text-[#ffb8c7]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={updatePassword.isPending}
                  className="inline-flex items-center gap-2 bg-[#ff003c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#b30029] disabled:opacity-50"
                >
                  {updatePassword.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  UPDATE_PASSWORD
                </button>
              </form>
            </section>

            <aside className="border border-[#222] bg-[#11131a] p-5 h-fit">
              <p className="text-[10px] text-white/30 tracking-wider mb-4">
                SECURITY_STATUS
              </p>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#222] pb-3">
                  <span className="text-white/45">Password Source</span>
                  <span className={settings?.hasCustomPassword ? "text-[#0aff00]" : "text-[#ffb800]"}>
                    {settings?.hasCustomPassword ? "DATABASE_HASH" : "ENV_FALLBACK"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/45">Session User</span>
                  <span className="text-[#00f0ff]">{user?.username}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
