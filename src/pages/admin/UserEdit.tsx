import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import BrandLogo from "@/components/BrandLogo";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  Receipt,
  Save,
  Settings,
  Tags,
  Shield,
  KeyRound,
  UserRound,
  Users,
  Wand2,
  Zap,
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
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider text-[#ff003c]/60 transition-colors hover:text-[#ff003c]"
        >
          <Zap className="h-4 w-4" />
          LOGOUT
        </button>
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider text-[#e1f5fe]/20 transition-colors hover:text-[#e1f5fe]/40"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK_TO_SITE
        </Link>
      </div>
    </aside>
  );
}

const roleOptions = ["user", "admin"] as const;

export default function AdminUserEdit() {
  const navigate = useNavigate();
  const params = useParams();
  const userId = Number(params.id);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    avatar: "",
    role: "user" as "user" | "admin",
    isActive: true,
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: targetUser, isLoading } = trpc.admin.userById.useQuery(
    { id: userId },
    { enabled: isAdmin && Number.isFinite(userId) },
  );
  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      setError("");
      setMessage("Data user berhasil diperbarui");
      setForm((current) => ({ ...current, newPassword: "", confirmPassword: "" }));
      await Promise.all([
        utils.admin.userById.invalidate({ id: userId }),
        utils.admin.users.invalidate(),
      ]);
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (!targetUser) return;
    setForm({
      username: targetUser.username || "",
      name: targetUser.name || "",
      email: targetUser.email || "",
      phone: targetUser.phone || "",
      avatar: targetUser.avatar || "",
      role: targetUser.role,
      isActive: targetUser.isActive,
      newPassword: "",
      confirmPassword: "",
    });
  }, [targetUser]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const newPassword = form.newPassword.trim();
    if (newPassword && newPassword.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }
    if (newPassword && newPassword !== form.confirmPassword) {
      setError("Konfirmasi password tidak sama");
      return;
    }
    updateUser.mutate({
      id: userId,
      username: form.username,
      name: form.name,
      email: form.email,
      phone: form.phone,
      avatar: form.avatar,
      role: form.role,
      isActive: form.isActive,
      newPassword: newPassword || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030305]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff003c]" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="flex min-h-[100dvh] bg-[#030305] font-terminal">
      <AdminSidebar active="users" />
      <AdminMobileNav active="users" />
      <main className="min-w-0 flex-1">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <p className="text-[10px] tracking-wider text-[#00f0ff]">INTEL // EDIT_USER</p>
        </header>

        <div className="p-4 pb-24 sm:p-6 lg:pb-6">
          <Link
            to="/admin/users"
            className="mb-5 inline-flex items-center gap-2 text-xs tracking-wider text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK_TO_USERS
          </Link>

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center border border-[#222] bg-[#11131a]">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff003c]" />
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="border border-[#222] bg-[#11131a] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#00f0ff]/10">
                    <UserRound className="h-5 w-5 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-wider text-white">USER_PROFILE</h1>
                    <p className="text-[10px] tracking-wider text-white/35">
                      Ubah identitas, role, status, dan password user
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      USERNAME
                    </label>
                    <input
                      value={form.username}
                      onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                      minLength={3}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      NAME
                    </label>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      EMAIL
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      PHONE
                    </label>
                    <input
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      AVATAR_URL
                    </label>
                    <input
                      value={form.avatar}
                      onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      ROLE
                    </label>
                    <select
                      value={form.role}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          role: event.target.value as "user" | "admin",
                        }))
                      }
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="mt-5 flex items-center gap-3 border border-[#222] bg-[#0b0d14] px-4 py-3 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                    className="accent-[#00f0ff]"
                  />
                  USER_ACTIVE
                </label>

              </section>

              <aside className="space-y-6">
                <section className="border border-[#222] bg-[#11131a] p-5">
                  <p className="mb-4 text-[10px] tracking-wider text-white/30">USER_PREVIEW</p>
                  <div className="flex min-w-0 items-center gap-4 border border-[#222] bg-[#0b0d14] p-4">
                    {form.avatar ? (
                      <img
                        src={form.avatar}
                        alt={form.name || form.username}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff003c]/10">
                        <UserRound className="h-7 w-7 text-[#ff003c]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{form.name || form.username}</p>
                      <p className="truncate text-[10px] text-white/35">{form.email || "-"}</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#ffb800]">
                        <Shield className="h-3 w-3" />
                        {form.role.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border border-[#222] bg-[#0b0d14] p-4">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center bg-[#ffb800]/10">
                        <KeyRound className="h-5 w-5 text-[#ffb800]" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold tracking-wider text-white">CHANGE_PASSWORD</h2>
                        <p className="text-[10px] tracking-wider text-white/35">
                          Kosongkan jika tidak diganti
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                          NEW_PASSWORD
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={form.newPassword}
                            onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                            minLength={8}
                            placeholder="Minimal 8 karakter"
                            className="w-full border border-[#222] bg-[#07080d] px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ffb800]/50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((current) => !current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition-colors hover:text-white"
                            aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                          CONFIRM_PASSWORD
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                            minLength={8}
                            placeholder="Ulangi password"
                            className="w-full border border-[#222] bg-[#07080d] px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ffb800]/50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((current) => !current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition-colors hover:text-white"
                            aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {message && (
                    <div className="mt-4 flex items-center gap-2 border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-xs text-[#0aff00]">
                      <CheckCircle2 className="h-4 w-4" />
                      {message}
                    </div>
                  )}
                  {error && (
                    <div className="mt-4 border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-xs text-[#ffb8c7]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={updateUser.isPending}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-[#ff003c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#b30029] disabled:opacity-50"
                  >
                    {updateUser.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    SAVE_USER
                  </button>
                </section>
              </aside>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}


