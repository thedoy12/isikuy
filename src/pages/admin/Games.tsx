import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { optimizedImagePath } from "@/lib/images";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination } from "@/components/admin/TablePagination";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import BrandLogo from "@/components/BrandLogo";
import {
  Gamepad2,
  TrendingUp,
  Star,
  Sparkles,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Save,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Bell,
  BarChart3,
  Receipt,
  Settings,
  Tags,
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

export default function AdminGames() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [imageDraft, setImageDraft] = useState({
    coverImage: "",
    cardImage: "",
    bannerImage: "",
  });
  const [productGameId, setProductGameId] = useState<number | undefined>();
  const [productPage, setProductPage] = useState(0);
  const [productPageSize, setProductPageSize] = useState(100);
  const [productSearch, setProductSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<"all" | "flowix" | "digiflazz" | "unmapped" | "inactive" | "manualPrice">("all");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [productDrafts, setProductDrafts] = useState<Record<number, string>>({});
  const [supplierDrafts, setSupplierDrafts] = useState<
    Record<number, { provider: "flowix" | "digiflazz"; code: string; targetFormat: "auto" | "player" | "pipe" | "dash" | "space" | "comma" }>
  >({});
  const pageSize = 10;

  const { data: categories } = trpc.game.categories.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: supplierRouting } = trpc.admin.supplierRouting.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: gamesList } = trpc.admin.games.useQuery(
    {
      search: search.trim() || undefined,
      categoryId,
      limit: pageSize,
      offset: page * pageSize,
    },
    { enabled: isAdmin },
  );
  const updateGame = trpc.admin.updateGame.useMutation({
    onSuccess: () => {
      utils.admin.games.invalidate();
      utils.game.list.invalidate();
      utils.game.trending.invalidate();
      utils.game.popular.invalidate();
    },
  });
  const syncFlowix = trpc.admin.syncFlowixCatalog.useMutation({
    onSuccess: (data) => {
      setSyncMessage(`FLOWIX_SYNCED ${data.games} CATALOGS / ${data.products} PRODUCTS`);
      setSyncError("");
      utils.admin.games.invalidate();
      utils.admin.products.invalidate();
      utils.game.list.invalidate();
      utils.game.trending.invalidate();
      utils.game.popular.invalidate();
      setPage(0);
    },
    onError: (err) => {
      setSyncMessage("");
      setSyncError(err.message);
    },
  });
  const syncDigiflazz = trpc.admin.syncDigiflazzCatalog.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setSyncMessage(`DIGIFLAZZ_SYNCED ${data.games} CATALOGS / ${data.products} PRODUCTS`);
        setSyncError("");
      } else {
        setSyncMessage(`DIGIFLAZZ_CACHE ${data.games} CATALOGS / ${data.products} PRODUCTS`);
        setSyncError(data.message || "Digiflazz belum bisa disinkronkan sekarang.");
      }
      utils.admin.games.invalidate();
      utils.admin.products.invalidate();
      utils.game.list.invalidate();
      utils.game.trending.invalidate();
      utils.game.popular.invalidate();
      setPage(0);
    },
    onError: (err) => {
      setSyncMessage("");
      setSyncError(err.message);
    },
  });
  const { data: productsList } = trpc.admin.products.useQuery(
    {
      gameId: productGameId,
      categoryId: productGameId ? undefined : categoryId,
      search: productSearch.trim() || undefined,
      supplier: supplierFilter,
      limit: productPageSize,
      offset: productPage * productPageSize,
    },
    { enabled: isAdmin },
  );
  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      utils.admin.products.invalidate();
      utils.game.list.invalidate();
    },
  });
  const bulkUpdateProducts = trpc.admin.bulkUpdateProducts.useMutation({
    onSuccess: () => {
      utils.admin.products.invalidate();
      utils.game.list.invalidate();
      utils.game.trending.invalidate();
      utils.game.popular.invalidate();
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    setPage(0);
    setProductGameId(undefined);
  }, [search, categoryId]);

  useEffect(() => {
    setProductPage(0);
  }, [productGameId, productSearch, supplierFilter, productPageSize]);

  useEffect(() => {
    const next: Record<number, string> = {};
    const nextSuppliers: typeof supplierDrafts = {};
    productsList?.items.forEach((product: any) => {
      next[product.id] = String(Math.round(Number(product.salePrice || product.basePrice || 0)));
      nextSuppliers[product.id] = {
        provider: product.supplierProvider === "digiflazz" ? "digiflazz" : "flowix",
        code: product.supplierProductCode || product.nominalAmount || "",
        targetFormat: product.supplierTargetFormat || "auto",
      };
    });
    setProductDrafts(next);
    setSupplierDrafts(nextSuppliers);
  }, [productsList?.items]);

  if (authLoading) {
    return <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#ff003c] animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  const startEditingImages = (game: any) => {
    setEditingGameId(game.id);
    setImageDraft({
      coverImage: game.coverImage || "",
      cardImage: game.cardImage || "",
      bannerImage: game.bannerImage || "",
    });
  };

  const saveImages = () => {
    if (!editingGameId) return;
    updateGame.mutate({
      id: editingGameId,
      coverImage: imageDraft.coverImage.trim() || null,
      cardImage: imageDraft.cardImage.trim() || null,
      bannerImage: imageDraft.bannerImage.trim() || null,
    });
    setEditingGameId(null);
  };

  const saveProductPrice = (productId: number) => {
    const salePrice = Number(productDrafts[productId]);
    if (!Number.isFinite(salePrice) || salePrice <= 0) return;
    updateProduct.mutate({ id: productId, salePrice });
  };

  const resetProductPrice = (productId: number) => {
    updateProduct.mutate({ id: productId, resetAutoPrice: true });
  };

  const saveSupplier = (productId: number) => {
    const draft = supplierDrafts[productId];
    if (!draft?.code.trim()) return;
    updateProduct.mutate({
      id: productId,
      supplierProvider: draft.provider,
      supplierProductCode: draft.code.trim(),
      supplierTargetFormat: draft.targetFormat,
    });
  };

  const runBulkForVisibleProducts = (action: "activate" | "deactivate" | "supplierFlowix" | "supplierDigiflazz" | "resetAutoPrice") => {
    const ids = productsList?.items.map((product: any) => product.id) ?? [];
    if (ids.length === 0) return;
    bulkUpdateProducts.mutate({ ids, action });
  };

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex font-terminal">
      <AdminSidebar active="games" />
      <AdminMobileNav active="games" />
      <main className="flex-1 min-w-0">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[10px] text-[#00f0ff] tracking-wider">ARSENAL // CATALOG_MANAGEMENT</p>
              {supplierRouting?.mode === "digiflazz" && (
                <p className="mt-1 text-[9px] text-[#ffb800]">
                  SOURCE_DIGIFLAZZ: katalog dan order produk memakai Digiflazz. Payment QRIS tetap Flowix.
                </p>
              )}
              {supplierRouting?.mode === "flowix" && (
                <p className="mt-1 text-[9px] text-[#00f0ff]">
                  SOURCE_FLOWIX: katalog dan order produk memakai Flowix. Payment QRIS tetap Flowix.
                </p>
              )}
              {supplierRouting?.mode === "digiflazz_fallback_flowix" && (
                <p className="mt-1 text-[9px] text-[#0aff00]">
                  SOURCE_FALLBACK: Digiflazz prioritas, Flowix fallback. Payment QRIS tetap Flowix.
                </p>
              )}
              {syncMessage && <p className="mt-1 text-[9px] text-[#0aff00]">{syncMessage}</p>}
              {syncError && <p className="mt-1 text-[9px] text-[#ffb800]">{syncError}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => syncFlowix.mutate()}
                disabled={syncFlowix.isPending || syncDigiflazz.isPending}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] tracking-wider hover:bg-[#00f0ff]/10 disabled:opacity-50"
              >
                {syncFlowix.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                SYNC_FLOWIX
              </button>
              <button
                onClick={() => syncDigiflazz.mutate()}
                disabled={syncFlowix.isPending || syncDigiflazz.isPending}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-[#0aff00]/30 text-[#0aff00] text-[10px] tracking-wider hover:bg-[#0aff00]/10 disabled:opacity-50"
              >
                {syncDigiflazz.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                SYNC_DIGIFLAZZ
              </button>
            </div>
          </div>
        </header>
        <div className="p-4 pb-24 sm:p-6 lg:pb-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] text-white/50 tracking-wider">
                CARI GAME FLOWIX / DIGIFLAZZ LALU EDIT GAMBAR DARI KOLOM IMAGES
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <select
                value={categoryId ?? ""}
                onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : undefined)}
                className="w-full bg-[#0b0d14] border border-[#222] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50 lg:w-56"
              >
                <option value="">ALL_CATEGORY</option>
                {categories?.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="SEARCH_GAME"
                className="w-full lg:w-72 bg-[#0b0d14] border border-[#222] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
              />
            </div>
          </div>
          <div className="border border-[#222] bg-[#11131a]">
            <div className="grid gap-3 p-3 xl:hidden">
              {gamesList?.items.map((g: any) => (
                <article key={g.id} className="border border-[#222] bg-[#0b0d14] p-4">
                  <div className="flex items-start gap-3">
                    {g.coverImage ? (
                      <img
                        src={optimizedImagePath(g.coverImage)}
                        alt={g.name}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white/5">
                        <ImageIcon className="h-5 w-5 text-white/20" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{g.name}</p>
                      <p className="mt-1 text-[10px] uppercase text-white/35">
                        {g.categoryName || "-"} / {g.platform}
                      </p>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <button onClick={() => updateGame.mutate({ id: g.id, isTrending: !g.isTrending })}
                          className={`flex items-center justify-center border border-white/10 py-2 ${g.isTrending ? "text-[#ff003c]" : "text-white/20"}`}>
                          <TrendingUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateGame.mutate({ id: g.id, isPopular: !g.isPopular })}
                          className={`flex items-center justify-center border border-white/10 py-2 ${g.isPopular ? "text-[#ffb800]" : "text-white/20"}`}>
                          <Star className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateGame.mutate({ id: g.id, isNew: !g.isNew })}
                          className={`flex items-center justify-center border border-white/10 py-2 ${g.isNew ? "text-[#00f0ff]" : "text-white/20"}`}>
                          <Sparkles className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateGame.mutate({ id: g.id, isActive: !g.isActive })}
                          className={`flex items-center justify-center border border-white/10 py-2 ${g.isActive ? "text-[#0aff00]" : "text-[#ff003c]"}`}>
                          {g.isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => editingGameId === g.id ? setEditingGameId(null) : startEditingImages(g)}
                      className="rounded bg-[#ffb800]/10 px-3 py-2 text-[10px] text-[#ffb800]"
                    >
                      IMAGES
                    </button>
                    <Link to={`/games/${g.slug}`} target="_blank"
                      className="rounded bg-[#00f0ff]/10 px-3 py-2 text-[10px] text-[#00f0ff]">VIEW</Link>
                  </div>
                  {editingGameId === g.id && (
                    <div className="mt-4 border-t border-[#222] pt-4">
                      <div className="mb-3 h-32 w-full overflow-hidden border border-white/10 bg-white/5">
                        {imageDraft.coverImage ? (
                          <img
                            src={optimizedImagePath(imageDraft.coverImage)}
                            alt={g.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-white/20" />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3">
                        {[
                          ["coverImage", "COVER URL"],
                          ["cardImage", "CARD URL"],
                          ["bannerImage", "BANNER URL"],
                        ].map(([field, label]) => (
                          <label key={field} className="block">
                            <span className="mb-1 block text-[9px] tracking-wider text-white/30">{label}</span>
                            <input
                              value={imageDraft[field as keyof typeof imageDraft]}
                              onChange={(event) =>
                                setImageDraft((current) => ({
                                  ...current,
                                  [field]: event.target.value,
                                }))
                              }
                              placeholder="https://... atau /games/nama.jpg"
                              className="w-full border border-[#222] bg-[#050609] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                            />
                          </label>
                        ))}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={saveImages}
                            disabled={updateGame.isPending}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] tracking-wider disabled:opacity-50"
                          >
                            <Save className="w-3 h-3" />
                            SAVE_IMAGES
                          </button>
                          <button
                            onClick={() => setEditingGameId(null)}
                            className="px-3 py-2 border border-white/10 text-white/40 text-[10px] tracking-wider"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto xl:block">
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
                  <Fragment key={g.id}>
                    <tr className="border-b border-[#222] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {g.coverImage ? (
                            <img
                              src={optimizedImagePath(g.coverImage)}
                              alt={g.name}
                              loading="lazy"
                              decoding="async"
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-white/20" />
                            </div>
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
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => editingGameId === g.id ? setEditingGameId(null) : startEditingImages(g)}
                            className="text-[10px] text-[#ffb800] hover:underline"
                          >
                            IMAGES
                          </button>
                          <Link to={`/games/${g.slug}`} target="_blank"
                            className="text-[10px] text-[#00f0ff] hover:underline">VIEW</Link>
                        </div>
                      </td>
                    </tr>
                    {editingGameId === g.id && (
                      <tr className="border-b border-[#222] bg-black/20">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-4">
                            <div className="w-28 h-28 bg-white/5 border border-white/10 rounded overflow-hidden flex items-center justify-center">
                              {imageDraft.coverImage ? (
                                <img
                                  src={optimizedImagePath(imageDraft.coverImage)}
                                  alt={g.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-white/20" />
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[
                                ["coverImage", "COVER URL"],
                                ["cardImage", "CARD URL"],
                                ["bannerImage", "BANNER URL"],
                              ].map(([field, label]) => (
                                <label key={field} className="block">
                                  <span className="block text-[9px] text-white/30 tracking-wider mb-1">{label}</span>
                                  <input
                                    value={imageDraft[field as keyof typeof imageDraft]}
                                    onChange={(event) =>
                                      setImageDraft((current) => ({
                                        ...current,
                                        [field]: event.target.value,
                                      }))
                                    }
                                    placeholder="https://... atau /games/nama.jpg"
                                    className="w-full bg-[#0b0d14] border border-[#222] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                                  />
                                </label>
                              ))}
                              <div className="md:col-span-3 flex items-center gap-2">
                                <button
                                  onClick={saveImages}
                                  disabled={updateGame.isPending}
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] tracking-wider disabled:opacity-50"
                                >
                                  <Save className="w-3 h-3" />
                                  SAVE_IMAGES
                                </button>
                                <button
                                  onClick={() => setEditingGameId(null)}
                                  className="px-3 py-2 border border-white/10 text-white/40 text-[10px] tracking-wider"
                                >
                                  CANCEL
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={gamesList?.total ?? 0}
              onPageChange={setPage}
            />
          </div>

          <section className="mt-6 border border-[#222] bg-[#11131a]">
            <div className="flex flex-col gap-3 border-b border-[#222] p-4">
              <div>
                <p className="text-[10px] tracking-wider text-[#00f0ff]">PRODUCT_PRICING</p>
                <p className="mt-1 text-[10px] tracking-wider text-white/35">
                  BASE = MODAL SUPPLIER, SALE = HARGA JUAL USER
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_220px_180px_120px]">
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="SEARCH_PRODUCT_OR_CODE"
                  className="w-full border border-[#222] bg-[#0b0d14] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                />
                <select
                  value={productGameId ?? ""}
                  onChange={(event) => setProductGameId(event.target.value ? Number(event.target.value) : undefined)}
                  className="w-full border border-[#222] bg-[#0b0d14] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                >
                  <option value="">ALL_PRODUCTS</option>
                  {gamesList?.items.map((game: any) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
                <select
                  value={supplierFilter}
                  onChange={(event) => setSupplierFilter(event.target.value as typeof supplierFilter)}
                  className="w-full border border-[#222] bg-[#0b0d14] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                >
                  <option value="all">ALL_SUPPLIER</option>
                  <option value="digiflazz">DIGIFLAZZ</option>
                  <option value="flowix">FLOWIX</option>
                  <option value="unmapped">UNMAPPED</option>
                  <option value="inactive">INACTIVE</option>
                  <option value="manualPrice">MANUAL_PRICE</option>
                </select>
                <select
                  value={productPageSize}
                  onChange={(event) => setProductPageSize(Number(event.target.value))}
                  className="w-full border border-[#222] bg-[#0b0d14] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                >
                  {[25, 50, 100, 250].map((size) => (
                    <option key={size} value={size}>
                      {size}/PAGE
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2 border border-white/10 bg-black/20 p-3">
                <span className="text-[10px] text-white/35">BULK_CURRENT_PAGE</span>
                <button onClick={() => runBulkForVisibleProducts("supplierDigiflazz")} disabled={bulkUpdateProducts.isPending}
                  className="border border-[#00f0ff]/25 px-3 py-2 text-[10px] text-[#00f0ff] disabled:opacity-50">
                  SET_DIGIFLAZZ
                </button>
                <button onClick={() => runBulkForVisibleProducts("supplierFlowix")} disabled={bulkUpdateProducts.isPending}
                  className="border border-[#ffb800]/25 px-3 py-2 text-[10px] text-[#ffb800] disabled:opacity-50">
                  SET_FLOWIX
                </button>
                <button onClick={() => runBulkForVisibleProducts("resetAutoPrice")} disabled={bulkUpdateProducts.isPending}
                  className="border border-[#0aff00]/25 px-3 py-2 text-[10px] text-[#0aff00] disabled:opacity-50">
                  AUTO_PRICE
                </button>
                <button onClick={() => runBulkForVisibleProducts("activate")} disabled={bulkUpdateProducts.isPending}
                  className="border border-[#0aff00]/25 px-3 py-2 text-[10px] text-[#0aff00] disabled:opacity-50">
                  ON
                </button>
                <button onClick={() => runBulkForVisibleProducts("deactivate")} disabled={bulkUpdateProducts.isPending}
                  className="border border-[#ff003c]/25 px-3 py-2 text-[10px] text-[#ff003c] disabled:opacity-50">
                  OFF
                </button>
              </div>
            </div>

            <div className="grid gap-3 p-3 xl:hidden">
              {productsList?.items.map((product: any) => {
                const cost = Number(product.basePrice || 0);
                const sale = Number(productDrafts[product.id] || product.salePrice || product.basePrice || 0);
                const margin = sale - cost;
                return (
                  <article key={product.id} className="border border-[#222] bg-[#0b0d14] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{product.name}</p>
                        <p className="mt-1 text-[10px] uppercase text-white/35">
                          {product.gameName} / {product.nominalAmount}
                        </p>
                      </div>
                      <span className={product.isPriceManual ? "text-[10px] text-[#ffb800]" : "text-[10px] text-[#0aff00]"}>
                        {product.isPriceManual ? "MANUAL" : "AUTO"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-3">
                      <div className="border border-white/10 p-2">
                        <p className="text-white/35">BASE</p>
                        <p className="mt-1 text-white">Rp{cost.toLocaleString()}</p>
                      </div>
                      <div className="border border-white/10 p-2">
                        <p className="text-white/35">MARGIN</p>
                        <p className={margin >= 0 ? "mt-1 text-[#0aff00]" : "mt-1 text-[#ff003c]"}>
                          Rp{margin.toLocaleString()}
                        </p>
                      </div>
                      <div className="border border-white/10 p-2">
                        <p className="text-white/35">STATUS</p>
                        <p className={product.isActive ? "mt-1 text-[#0aff00]" : "mt-1 text-[#ff003c]"}>
                          {product.isActive ? "ON" : "OFF"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        inputMode="numeric"
                        value={productDrafts[product.id] ?? ""}
                        onChange={(event) =>
                          setProductDrafts((current) => ({ ...current, [product.id]: event.target.value.replace(/\D/g, "") }))
                        }
                        className="min-w-0 flex-1 border border-[#222] bg-[#050609] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                      />
                      <button
                        onClick={() => saveProductPrice(product.id)}
                        disabled={updateProduct.isPending}
                        className="border border-[#00f0ff]/30 px-3 py-2 text-[10px] text-[#00f0ff] disabled:opacity-50"
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => resetProductPrice(product.id)}
                        disabled={updateProduct.isPending}
                        className="border border-[#ffb800]/30 px-3 py-2 text-[10px] text-[#ffb800] disabled:opacity-50"
                      >
                        AUTO
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[130px_1fr_120px_auto]">
                      <select
                        value={supplierDrafts[product.id]?.provider || "flowix"}
                        onChange={(event) =>
                          setSupplierDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              provider: event.target.value === "digiflazz" ? "digiflazz" : "flowix",
                              code: current[product.id]?.code || product.supplierProductCode || product.nominalAmount || "",
                              targetFormat: current[product.id]?.targetFormat || "auto",
                            },
                          }))
                        }
                        className="border border-[#222] bg-[#050609] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                      >
                        <option value="flowix">FLOWIX</option>
                        <option value="digiflazz">DIGIFLAZZ</option>
                      </select>
                      <input
                        value={supplierDrafts[product.id]?.code ?? ""}
                        onChange={(event) =>
                          setSupplierDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              provider: current[product.id]?.provider || "flowix",
                              code: event.target.value,
                              targetFormat: current[product.id]?.targetFormat || "auto",
                            },
                          }))
                        }
                        placeholder="SUPPLIER_CODE"
                        className="min-w-0 border border-[#222] bg-[#050609] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                      />
                      <select
                        value={supplierDrafts[product.id]?.targetFormat || "auto"}
                        onChange={(event) =>
                          setSupplierDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              provider: current[product.id]?.provider || "flowix",
                              code: current[product.id]?.code || "",
                              targetFormat: event.target.value as any,
                            },
                          }))
                        }
                        className="border border-[#222] bg-[#050609] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
                      >
                        <option value="auto">AUTO</option>
                        <option value="player">PLAYER</option>
                        <option value="pipe">ID|SERVER</option>
                        <option value="dash">ID-SERVER</option>
                        <option value="space">ID SERVER</option>
                        <option value="comma">ID,SERVER</option>
                      </select>
                      <button
                        onClick={() => saveSupplier(product.id)}
                        disabled={updateProduct.isPending}
                        className="border border-[#00f0ff]/30 px-3 py-2 text-[10px] text-[#00f0ff] disabled:opacity-50"
                      >
                        SAVE_API
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#ff003c]">
                    <th className="px-4 py-3 text-left text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">PRODUCT</th>
                    <th className="px-4 py-3 text-left text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">GAME</th>
                    <th className="px-4 py-3 text-right text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">BASE</th>
                    <th className="px-4 py-3 text-right text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">SALE</th>
                    <th className="px-4 py-3 text-right text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">MARGIN</th>
                    <th className="px-4 py-3 text-center text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">MODE</th>
                    <th className="px-4 py-3 text-left text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">SUPPLIER</th>
                    <th className="px-4 py-3 text-left text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {productsList?.items.map((product: any) => {
                    const cost = Number(product.basePrice || 0);
                    const sale = Number(productDrafts[product.id] || product.salePrice || product.basePrice || 0);
                    const margin = sale - cost;
                    return (
                      <tr key={product.id} className="border-b border-[#222] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-white">{product.name}</p>
                          <p className="mt-1 text-[10px] text-white/30">{product.nominalAmount}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/45">{product.gameName}</td>
                        <td className="px-4 py-3 text-right text-xs text-white/60">Rp{cost.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <input
                            inputMode="numeric"
                            value={productDrafts[product.id] ?? ""}
                            onChange={(event) =>
                              setProductDrafts((current) => ({ ...current, [product.id]: event.target.value.replace(/\D/g, "") }))
                            }
                            className="ml-auto block w-32 border border-[#222] bg-[#050609] px-3 py-2 text-right text-xs text-white outline-none focus:border-[#00f0ff]/50"
                          />
                        </td>
                        <td className={margin >= 0 ? "px-4 py-3 text-right text-xs text-[#0aff00]" : "px-4 py-3 text-right text-xs text-[#ff003c]"}>
                          Rp{margin.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={product.isPriceManual ? "text-[10px] text-[#ffb800]" : "text-[10px] text-[#0aff00]"}>
                            {product.isPriceManual ? "MANUAL" : "AUTO"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="grid w-[360px] grid-cols-[105px_1fr_95px] gap-2">
                            <select
                              value={supplierDrafts[product.id]?.provider || "flowix"}
                              onChange={(event) =>
                                setSupplierDrafts((current) => ({
                                  ...current,
                                  [product.id]: {
                                    provider: event.target.value === "digiflazz" ? "digiflazz" : "flowix",
                                    code: current[product.id]?.code || product.supplierProductCode || product.nominalAmount || "",
                                    targetFormat: current[product.id]?.targetFormat || "auto",
                                  },
                                }))
                              }
                              className="border border-[#222] bg-[#050609] px-2 py-2 text-[10px] text-white outline-none focus:border-[#00f0ff]/50"
                            >
                              <option value="flowix">FLOWIX</option>
                              <option value="digiflazz">DIGIFLAZZ</option>
                            </select>
                            <input
                              value={supplierDrafts[product.id]?.code ?? ""}
                              onChange={(event) =>
                                setSupplierDrafts((current) => ({
                                  ...current,
                                  [product.id]: {
                                    provider: current[product.id]?.provider || "flowix",
                                    code: event.target.value,
                                    targetFormat: current[product.id]?.targetFormat || "auto",
                                  },
                                }))
                              }
                              className="min-w-0 border border-[#222] bg-[#050609] px-2 py-2 text-[10px] text-white outline-none focus:border-[#00f0ff]/50"
                            />
                            <select
                              value={supplierDrafts[product.id]?.targetFormat || "auto"}
                              onChange={(event) =>
                                setSupplierDrafts((current) => ({
                                  ...current,
                                  [product.id]: {
                                    provider: current[product.id]?.provider || "flowix",
                                    code: current[product.id]?.code || "",
                                    targetFormat: event.target.value as any,
                                  },
                                }))
                              }
                              className="border border-[#222] bg-[#050609] px-2 py-2 text-[10px] text-white outline-none focus:border-[#00f0ff]/50"
                            >
                              <option value="auto">AUTO</option>
                              <option value="player">PLAYER</option>
                              <option value="pipe">ID|SV</option>
                              <option value="dash">ID-SV</option>
                              <option value="space">ID SV</option>
                              <option value="comma">ID,SV</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveProductPrice(product.id)}
                              disabled={updateProduct.isPending}
                              className="border border-[#00f0ff]/25 px-3 py-2 text-[10px] text-[#00f0ff] disabled:opacity-50"
                            >
                              SAVE
                            </button>
                            <button
                              onClick={() => resetProductPrice(product.id)}
                              disabled={updateProduct.isPending}
                              className="border border-[#ffb800]/25 px-3 py-2 text-[10px] text-[#ffb800] disabled:opacity-50"
                            >
                              AUTO
                            </button>
                            <button
                              onClick={() => saveSupplier(product.id)}
                              disabled={updateProduct.isPending}
                              className="border border-[#00f0ff]/25 px-3 py-2 text-[10px] text-[#00f0ff] disabled:opacity-50"
                            >
                              API
                            </button>
                            <button
                              onClick={() => updateProduct.mutate({ id: product.id, isActive: !product.isActive })}
                              disabled={updateProduct.isPending}
                              className={product.isActive ? "border border-[#ff003c]/25 px-3 py-2 text-[10px] text-[#ff003c]" : "border border-[#0aff00]/25 px-3 py-2 text-[10px] text-[#0aff00]"}
                            >
                              {product.isActive ? "OFF" : "ON"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={productPage}
              pageSize={productPageSize}
              total={productsList?.total ?? 0}
              onPageChange={setProductPage}
            />
          </section>
        </div>
      </main>
    </div>
  );
}


