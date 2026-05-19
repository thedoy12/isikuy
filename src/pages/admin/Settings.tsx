import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import BrandLogo from "@/components/BrandLogo";
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Gamepad2,
  Globe2,
  Loader2,
  Lock,
  Mail,
  Megaphone,
  Receipt,
  Save,
  Search,
  Settings,
  Tags,
  Smartphone,
  Users,
  Wand2,
  Zap,
} from "lucide-react";

const DEFAULT_SITE_FORM = {
  siteName: "ISIKUY TOPUP",
  siteTagline: "Top Up Game, Pulsa, dan Voucher Digital",
  metaTitle: "ISIKUY TOPUP - Top Up Game, Pulsa, dan Voucher Digital",
  metaDescription:
    "ISIKUY TOPUP melayani top up game, pulsa, e-wallet, dan voucher digital dengan proses cepat, pembayaran praktis, serta bantuan melalui WhatsApp 0895393061538 dan email putradadoy@gmail.com.",
  metaKeywords:
    "top up ml murah instant, diamond ml murah legal, top up ff via dana, top up valorant points murah, top up pubg qris, top up hok murah terpercaya, top up game pakai dana, top up qris, top up pakai gopay, top up tanpa login, top up hok, top up zzz, top up wuthering waves, top up hsr murah",
  canonicalUrl: "",
  ogImage: "",
  contactEmail: "putradadoy@gmail.com",
  contactPhone: "0895393061538",
  whatsappNumber: "62895393061538",
  instagramUrl: "",
  robotsIndex: true,
  robotsFollow: true,
  popupEnabled: false,
  popupTitle: "Promo ISIKUY",
  popupMessage: "Top up game favorit kamu lebih cepat dengan pembayaran praktis.",
  popupImage: "",
  popupButtonText: "Lihat Game",
  popupButtonUrl: "/games",
  popupDismissHours: 24,
  toolsPopupEnabled: true,
  toolsPopupTitle: "Mini Tools ISIKUY",
  toolsPopupMessage: "Spin challenge, cek aura, hitung winrate, dan generate nickname gaming buat konten mabar kamu.",
  toolsPopupImage: "",
  toolsPopupButtonText: "Buka Tools",
  toolsPopupButtonUrl: "/tools",
  toolsPopupDismissHours: 12,
};

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
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [siteForm, setSiteForm] = useState(DEFAULT_SITE_FORM);
  const [siteMessage, setSiteMessage] = useState("");
  const [siteError, setSiteError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState(
    "Pembayaran sedang ditutup sementara karena Flowix sedang maintenance. Silakan coba lagi nanti.",
  );

  const { data: settings } = trpc.admin.settings.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: siteSettings } = trpc.admin.siteSettings.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: paymentStatus } = trpc.admin.paymentStatus.useQuery(undefined, {
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
  const updateSiteSettings = trpc.admin.updateSiteSettings.useMutation({
    onSuccess: async () => {
      setSiteError("");
      setSiteMessage("Pengaturan SEO, kontak, popup utama, dan popup tools berhasil disimpan");
      await Promise.all([
        utils.admin.siteSettings.invalidate(),
        utils.site.publicSettings.invalidate(),
      ]);
    },
    onError: (err) => {
      setSiteMessage("");
      setSiteError(err.message);
    },
  });
  const setPaymentMaintenance = trpc.admin.setPaymentMaintenance.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.paymentStatus.invalidate(),
        utils.payment.status.invalidate(),
      ]);
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (siteSettings) {
      setSiteForm(siteSettings);
    }
  }, [siteSettings]);

  useEffect(() => {
    if (paymentStatus?.message) setPaymentMessage(paymentStatus.message);
  }, [paymentStatus?.message]);

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

  const updateSiteField = <Key extends keyof typeof DEFAULT_SITE_FORM>(
    key: Key,
    value: (typeof DEFAULT_SITE_FORM)[Key],
  ) => {
    setSiteForm((current) => ({ ...current, [key]: value }));
  };

  const submitSiteSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSiteMessage("");
    setSiteError("");
    updateSiteSettings.mutate({
      ...siteForm,
      popupDismissHours: Number(siteForm.popupDismissHours) || 24,
      toolsPopupDismissHours: Number(siteForm.toolsPopupDismissHours) || 12,
    });
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
                  <div className="relative">
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 pr-11 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition-colors hover:text-white"
                      aria-label={showPasswords ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-white/40 tracking-wider mb-2">
                      PASSWORD_BARU
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        minLength={8}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 pr-11 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition-colors hover:text-white"
                        aria-label={showPasswords ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 tracking-wider mb-2">
                      KONFIRMASI
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        minLength={8}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 pr-11 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition-colors hover:text-white"
                        aria-label={showPasswords ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

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

              <div className="mt-6 border-t border-[#222] pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#ffb800]" />
                  <p className="text-[10px] tracking-wider text-white/30">PAYMENT_MAINTENANCE</p>
                </div>
                <p className={paymentStatus?.enabled ? "mb-3 text-xs font-bold text-[#ffb800]" : "mb-3 text-xs font-bold text-[#0aff00]"}>
                  {paymentStatus?.enabled ? "PAYMENT_CLOSED" : "PAYMENT_OPEN"}
                </p>
                <textarea
                  value={paymentMessage}
                  onChange={(event) => setPaymentMessage(event.target.value)}
                  className="min-h-24 w-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                />
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMaintenance.mutate({ enabled: true, message: paymentMessage })}
                    disabled={setPaymentMaintenance.isPending}
                    className="bg-[#ffb800] px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
                  >
                    TUTUP_PAYMENT
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMaintenance.mutate({ enabled: false, message: paymentMessage })}
                    disabled={setPaymentMaintenance.isPending}
                    className="bg-[#0aff00] px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
                  >
                    BUKA_PAYMENT
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <form onSubmit={submitSiteSettings} className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="space-y-6">
              <div className="border border-[#222] bg-[#11131a] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#00f0ff]/10">
                    <Search className="h-5 w-5 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-wider text-white">
                      SEO_CONTROL
                    </h2>
                    <p className="text-[10px] tracking-wider text-white/35">
                      Meta title, description, indexing, dan social preview
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        SITE_NAME
                      </label>
                      <input
                        value={siteForm.siteName}
                        onChange={(event) => updateSiteField("siteName", event.target.value)}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        TAGLINE
                      </label>
                      <input
                        value={siteForm.siteTagline}
                        onChange={(event) => updateSiteField("siteTagline", event.target.value)}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      META_TITLE
                    </label>
                    <input
                      value={siteForm.metaTitle}
                      onChange={(event) => updateSiteField("metaTitle", event.target.value)}
                      maxLength={160}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                    <p className="mt-1 text-[10px] text-white/30">
                      {siteForm.metaTitle.length}/160 karakter
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      META_DESCRIPTION
                    </label>
                    <textarea
                      value={siteForm.metaDescription}
                      onChange={(event) => updateSiteField("metaDescription", event.target.value)}
                      maxLength={320}
                      rows={4}
                      className="w-full resize-none border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                    <p className="mt-1 text-[10px] text-white/30">
                      {siteForm.metaDescription.length}/320 karakter
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        KEYWORDS
                      </label>
                      <textarea
                        value={siteForm.metaKeywords}
                        onChange={(event) => updateSiteField("metaKeywords", event.target.value)}
                        rows={3}
                        className="w-full resize-none border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        OG_IMAGE_URL
                      </label>
                      <input
                        value={siteForm.ogImage}
                        onChange={(event) => updateSiteField("ogImage", event.target.value)}
                        placeholder="https://domain.com/og-image.jpg"
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      />
                      <label className="mb-2 mt-4 block text-[10px] tracking-wider text-white/40">
                        CANONICAL_URL
                      </label>
                      <input
                        value={siteForm.canonicalUrl}
                        onChange={(event) => updateSiteField("canonicalUrl", event.target.value)}
                        placeholder="https://isikuy.com"
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 border border-[#222] bg-[#0b0d14] px-4 py-3 text-xs text-white/55">
                      <input
                        type="checkbox"
                        checked={siteForm.robotsIndex}
                        onChange={(event) => updateSiteField("robotsIndex", event.target.checked)}
                        className="accent-[#00f0ff]"
                      />
                      ROBOTS_INDEX
                    </label>
                    <label className="flex items-center gap-3 border border-[#222] bg-[#0b0d14] px-4 py-3 text-xs text-white/55">
                      <input
                        type="checkbox"
                        checked={siteForm.robotsFollow}
                        onChange={(event) => updateSiteField("robotsFollow", event.target.checked)}
                        className="accent-[#00f0ff]"
                      />
                      ROBOTS_FOLLOW
                    </label>
                  </div>
                </div>
              </div>

              <div className="border border-[#222] bg-[#11131a] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#ff003c]/10">
                    <Mail className="h-5 w-5 text-[#ff003c]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-wider text-white">
                      CONTACT_CHANNELS
                    </h2>
                    <p className="text-[10px] tracking-wider text-white/35">
                      Dipakai di footer, halaman kontak, dan rich contact
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      EMAIL
                    </label>
                    <input
                      type="email"
                      value={siteForm.contactEmail}
                      onChange={(event) => updateSiteField("contactEmail", event.target.value)}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      PHONE_DISPLAY
                    </label>
                    <input
                      value={siteForm.contactPhone}
                      onChange={(event) => updateSiteField("contactPhone", event.target.value)}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      WHATSAPP_NUMBER
                    </label>
                    <input
                      value={siteForm.whatsappNumber}
                      onChange={(event) => updateSiteField("whatsappNumber", event.target.value)}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      INSTAGRAM_URL
                    </label>
                    <input
                      value={siteForm.instagramUrl}
                      onChange={(event) => updateSiteField("instagramUrl", event.target.value)}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="border border-[#222] bg-[#11131a] p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#ff003c]/10">
                    <Megaphone className="h-5 w-5 text-[#ff003c]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-wider text-white">
                      POPUP_CAMPAIGN
                    </h2>
                    <p className="text-[10px] tracking-wider text-white/35">
                      Modal promosi publik
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between border border-[#222] bg-[#0b0d14] px-4 py-3 text-xs text-white/55">
                    ENABLE_POPUP
                    <input
                      type="checkbox"
                      checked={siteForm.popupEnabled}
                      onChange={(event) => updateSiteField("popupEnabled", event.target.checked)}
                      className="accent-[#ff003c]"
                    />
                  </label>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      POPUP_TITLE
                    </label>
                    <input
                      value={siteForm.popupTitle}
                      onChange={(event) => updateSiteField("popupTitle", event.target.value)}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#ff003c]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      POPUP_MESSAGE
                    </label>
                    <textarea
                      value={siteForm.popupMessage}
                      onChange={(event) => updateSiteField("popupMessage", event.target.value)}
                      rows={4}
                      className="w-full resize-none border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#ff003c]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      POPUP_IMAGE_URL
                    </label>
                    <input
                      value={siteForm.popupImage}
                      onChange={(event) => updateSiteField("popupImage", event.target.value)}
                      placeholder="https://domain.com/promo.jpg"
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#ff003c]/50"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        BUTTON_TEXT
                      </label>
                      <input
                        value={siteForm.popupButtonText}
                        onChange={(event) => updateSiteField("popupButtonText", event.target.value)}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#ff003c]/50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        BUTTON_URL
                      </label>
                      <input
                        value={siteForm.popupButtonUrl}
                        onChange={(event) => updateSiteField("popupButtonUrl", event.target.value)}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#ff003c]/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      DISMISS_HOURS
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={siteForm.popupDismissHours}
                      onChange={(event) =>
                        updateSiteField("popupDismissHours", Number(event.target.value))
                      }
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#ff003c]/50"
                    />
                  </div>
                </div>
              </section>

              <section className="border border-[#222] bg-[#11131a] p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#00f0ff]/10">
                    <Megaphone className="h-5 w-5 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-wider text-white">
                      TOOLS_POPUP
                    </h2>
                    <p className="text-[10px] tracking-wider text-white/35">
                      Modal promosi halaman tools
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between border border-[#222] bg-[#0b0d14] px-4 py-3 text-xs text-white/55">
                    ENABLE_TOOLS_POPUP
                    <input
                      type="checkbox"
                      checked={siteForm.toolsPopupEnabled}
                      onChange={(event) => updateSiteField("toolsPopupEnabled", event.target.checked)}
                      className="accent-[#00f0ff]"
                    />
                  </label>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      TOOLS_POPUP_TITLE
                    </label>
                    <input
                      value={siteForm.toolsPopupTitle}
                      onChange={(event) => updateSiteField("toolsPopupTitle", event.target.value)}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      TOOLS_POPUP_MESSAGE
                    </label>
                    <textarea
                      value={siteForm.toolsPopupMessage}
                      onChange={(event) => updateSiteField("toolsPopupMessage", event.target.value)}
                      rows={4}
                      className="w-full resize-none border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      TOOLS_POPUP_IMAGE_URL
                    </label>
                    <input
                      value={siteForm.toolsPopupImage}
                      onChange={(event) => updateSiteField("toolsPopupImage", event.target.value)}
                      placeholder="https://domain.com/tools-promo.jpg"
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        TOOLS_BUTTON_TEXT
                      </label>
                      <input
                        value={siteForm.toolsPopupButtonText}
                        onChange={(event) => updateSiteField("toolsPopupButtonText", event.target.value)}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                        TOOLS_BUTTON_URL
                      </label>
                      <input
                        value={siteForm.toolsPopupButtonUrl}
                        onChange={(event) => updateSiteField("toolsPopupButtonUrl", event.target.value)}
                        className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-wider text-white/40">
                      TOOLS_DISMISS_HOURS
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={siteForm.toolsPopupDismissHours}
                      onChange={(event) =>
                        updateSiteField("toolsPopupDismissHours", Number(event.target.value))
                      }
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>
              </section>

              <section className="border border-[#222] bg-[#11131a] p-5">
                <p className="mb-4 text-[10px] tracking-wider text-white/30">
                  LIVE_PREVIEW
                </p>
                <div className="rounded-xl border border-[#ff4967]/25 bg-[#0b0509] p-5">
                  {siteForm.popupImage ? (
                    <img
                      src={siteForm.popupImage}
                      alt={siteForm.popupTitle || "Preview popup"}
                      className="mb-4 h-36 w-full rounded-lg border border-white/10 object-cover"
                    />
                  ) : null}
                  <p className="text-xs uppercase tracking-[0.2em] text-[#ff6a82]">
                    {siteForm.siteName}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-bold text-white">
                    {siteForm.popupTitle || siteForm.metaTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    {siteForm.popupMessage || siteForm.metaDescription}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { icon: Globe2, label: "SEO" },
                      { icon: Smartphone, label: "WA" },
                      { icon: Megaphone, label: "POPUP" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="border border-white/10 bg-black/30 p-3 text-center"
                      >
                        <item.icon className="mx-auto mb-2 h-4 w-4 text-[#ff4967]" />
                        <p className="text-[10px] text-white/50">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {siteMessage && (
                  <div className="mt-4 flex items-center gap-2 border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-xs text-[#0aff00]">
                    <CheckCircle2 className="h-4 w-4" />
                    {siteMessage}
                  </div>
                )}
                {siteError && (
                  <div className="mt-4 border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-xs text-[#ffb8c7]">
                    {siteError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={updateSiteSettings.isPending}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-[#ff003c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#b30029] disabled:opacity-50"
                >
                  {updateSiteSettings.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  SAVE_SITE_SETTINGS
                </button>
              </section>
            </aside>
          </form>
        </div>
      </main>
    </div>
  );
}


