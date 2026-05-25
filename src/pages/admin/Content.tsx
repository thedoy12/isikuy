import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  FileText,
  Gamepad2,
  Loader2,
  Megaphone,
  Receipt,
  Save,
  Settings,
  Tags,
  Trash2,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

type BannerForm = {
  id: number | null;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  position: "hero" | "promo" | "sidebar";
  bgColor: string;
  textColor: string;
  sortOrder: string;
  isActive: boolean;
};

type FaqForm = {
  id: number | null;
  question: string;
  answer: string;
  category: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyBanner: BannerForm = {
  id: null,
  title: "",
  subtitle: "",
  image: "",
  link: "",
  position: "promo",
  bgColor: "#0b0d14",
  textColor: "#ffffff",
  sortOrder: "0",
  isActive: true,
};

const emptyFaq: FaqForm = {
  id: null,
  question: "",
  answer: "",
  category: "general",
  sortOrder: "0",
  isActive: true,
};

function AdminSidebar({ active }: { active: string }) {
  const { logout } = useAuth();
  const navItems = [
    { id: "dashboard", label: "CONSOLE", icon: BarChart3, href: "/admin" },
    { id: "games", label: "ARSENAL", icon: Gamepad2, href: "/admin/games" },
    { id: "transactions", label: "FINANCIALS", icon: Receipt, href: "/admin/transactions" },
    { id: "users", label: "INTEL", icon: Users, href: "/admin/users" },
    { id: "vouchers", label: "VOUCHERS", icon: Tags, href: "/admin/vouchers" },
    { id: "content", label: "CONTENT", icon: FileText, href: "/admin/content" },
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

export default function AdminContent() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBanner);
  const [faqForm, setFaqForm] = useState<FaqForm>(emptyFaq);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: banners } = trpc.admin.banners.useQuery(undefined, { enabled: isAdmin });
  const { data: faqs } = trpc.admin.faqs.useQuery(undefined, { enabled: isAdmin });

  const invalidate = async () => {
    await Promise.all([
      utils.admin.banners.invalidate(),
      utils.admin.faqs.invalidate(),
      utils.banner.list.invalidate(),
      utils.faq.list.invalidate(),
    ]);
  };

  const saveBanner = trpc.admin.createBanner.useMutation({
    onSuccess: async () => {
      setBannerForm(emptyBanner);
      setMessage("Banner berhasil disimpan");
      setError("");
      await invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });
  const updateBanner = trpc.admin.updateBanner.useMutation({
    onSuccess: async () => {
      setBannerForm(emptyBanner);
      setMessage("Banner berhasil diperbarui");
      setError("");
      await invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });
  const deleteBanner = trpc.admin.deleteBanner.useMutation({
    onSuccess: invalidate,
  });
  const saveFaq = trpc.admin.createFaq.useMutation({
    onSuccess: async () => {
      setFaqForm(emptyFaq);
      setMessage("FAQ berhasil disimpan");
      setError("");
      await invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });
  const updateFaq = trpc.admin.updateFaq.useMutation({
    onSuccess: async () => {
      setFaqForm(emptyFaq);
      setMessage("FAQ berhasil diperbarui");
      setError("");
      await invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });
  const deleteFaq = trpc.admin.deleteFaq.useMutation({
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const submitBanner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      title: bannerForm.title,
      subtitle: bannerForm.subtitle || null,
      image: bannerForm.image || null,
      link: bannerForm.link || null,
      position: bannerForm.position,
      bgColor: bannerForm.bgColor || null,
      textColor: bannerForm.textColor || null,
      sortOrder: Number(bannerForm.sortOrder) || 0,
      isActive: bannerForm.isActive,
    };
    if (bannerForm.id) updateBanner.mutate({ id: bannerForm.id, ...payload });
    else saveBanner.mutate(payload);
  };

  const submitFaq = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      question: faqForm.question,
      answer: faqForm.answer,
      category: faqForm.category || "general",
      sortOrder: Number(faqForm.sortOrder) || 0,
      isActive: faqForm.isActive,
    };
    if (faqForm.id) updateFaq.mutate({ id: faqForm.id, ...payload });
    else saveFaq.mutate(payload);
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
      <AdminSidebar active="content" />
      <AdminMobileNav active="content" />
      <main className="min-w-0 flex-1">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-6 py-4">
          <p className="text-[10px] tracking-wider text-[#00f0ff]">CONTENT // BANNERS_FAQ</p>
        </header>

        <div className="grid gap-6 p-6 pb-24 lg:grid-cols-2 lg:pb-6">
          <section className="border border-[#222] bg-[#11131a] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-[#ff003c]" />
              <h1 className="text-lg font-bold tracking-wider text-white">BANNERS</h1>
            </div>
            <form onSubmit={submitBanner} className="grid gap-3">
              <input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} placeholder="TITLE" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" required />
              <textarea value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} placeholder="SUBTITLE" rows={3} className="resize-none border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
              <input value={bannerForm.image} onChange={(e) => setBannerForm({ ...bannerForm, image: e.target.value })} placeholder="IMAGE_URL" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
              <input value={bannerForm.link} onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })} placeholder="LINK_URL" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
              <div className="grid gap-3 sm:grid-cols-3">
                <select value={bannerForm.position} onChange={(e) => setBannerForm({ ...bannerForm, position: e.target.value as BannerForm["position"] })} className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none">
                  <option value="hero">HERO</option>
                  <option value="promo">PROMO</option>
                  <option value="sidebar">SIDEBAR</option>
                </select>
                <input value={bannerForm.sortOrder} onChange={(e) => setBannerForm({ ...bannerForm, sortOrder: e.target.value })} placeholder="SORT" type="number" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
                <label className="flex items-center gap-2 border border-[#222] bg-[#0b0d14] px-4 py-3 text-xs text-white/60">
                  <input type="checkbox" checked={bannerForm.isActive} onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })} className="accent-[#00f0ff]" />
                  ACTIVE
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={bannerForm.bgColor} onChange={(e) => setBannerForm({ ...bannerForm, bgColor: e.target.value })} placeholder="BG_COLOR" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
                <input value={bannerForm.textColor} onChange={(e) => setBannerForm({ ...bannerForm, textColor: e.target.value })} placeholder="TEXT_COLOR" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
              </div>
              <button type="submit" disabled={saveBanner.isPending || updateBanner.isPending} className="inline-flex items-center justify-center gap-2 bg-[#ff003c] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                <Save className="h-4 w-4" />
                {bannerForm.id ? "UPDATE_BANNER" : "CREATE_BANNER"}
              </button>
            </form>
            <div className="mt-6 space-y-2">
              {banners?.map((banner: any) => (
                <div key={banner.id} className="flex items-center justify-between gap-3 border border-[#222] bg-black/20 p-3">
                  <button type="button" onClick={() => setBannerForm({ id: banner.id, title: banner.title, subtitle: banner.subtitle || "", image: banner.image || "", link: banner.link || "", position: banner.position, bgColor: banner.bgColor || "", textColor: banner.textColor || "", sortOrder: String(banner.sortOrder ?? 0), isActive: banner.isActive })} className="min-w-0 text-left">
                    <p className="truncate text-sm text-white">{banner.title}</p>
                    <p className="text-[10px] text-white/35">{banner.position} / {banner.isActive ? "ON" : "OFF"}</p>
                  </button>
                  <button type="button" onClick={() => deleteBanner.mutate({ id: banner.id })} className="p-2 text-[#ff003c]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-[#222] bg-[#11131a] p-6">
            <div className="mb-5 flex items-center gap-3">
              <FileText className="h-5 w-5 text-[#00f0ff]" />
              <h1 className="text-lg font-bold tracking-wider text-white">FAQ</h1>
            </div>
            <form onSubmit={submitFaq} className="grid gap-3">
              <input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} placeholder="QUESTION" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" required />
              <textarea value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} placeholder="ANSWER" rows={6} className="resize-none border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" required />
              <div className="grid gap-3 sm:grid-cols-3">
                <input value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} placeholder="CATEGORY" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
                <input value={faqForm.sortOrder} onChange={(e) => setFaqForm({ ...faqForm, sortOrder: e.target.value })} placeholder="SORT" type="number" className="border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none" />
                <label className="flex items-center gap-2 border border-[#222] bg-[#0b0d14] px-4 py-3 text-xs text-white/60">
                  <input type="checkbox" checked={faqForm.isActive} onChange={(e) => setFaqForm({ ...faqForm, isActive: e.target.checked })} className="accent-[#00f0ff]" />
                  ACTIVE
                </label>
              </div>
              <button type="submit" disabled={saveFaq.isPending || updateFaq.isPending} className="inline-flex items-center justify-center gap-2 bg-[#00f0ff] px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
                <Save className="h-4 w-4" />
                {faqForm.id ? "UPDATE_FAQ" : "CREATE_FAQ"}
              </button>
            </form>
            <div className="mt-6 space-y-2">
              {faqs?.map((faq: any) => (
                <div key={faq.id} className="flex items-center justify-between gap-3 border border-[#222] bg-black/20 p-3">
                  <button type="button" onClick={() => setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer, category: faq.category || "general", sortOrder: String(faq.sortOrder ?? 0), isActive: faq.isActive })} className="min-w-0 text-left">
                    <p className="truncate text-sm text-white">{faq.question}</p>
                    <p className="text-[10px] text-white/35">{faq.category} / {faq.isActive ? "ON" : "OFF"}</p>
                  </button>
                  <button type="button" onClick={() => deleteFaq.mutate({ id: faq.id })} className="p-2 text-[#ff003c]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {(message || error) && (
            <div className="lg:col-span-2">
              {message && <p className="border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-xs text-[#0aff00]">{message}</p>}
              {error && <p className="border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-xs text-[#ffb8c7]">{error}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
