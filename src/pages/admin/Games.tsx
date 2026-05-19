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
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [imageDraft, setImageDraft] = useState({
    coverImage: "",
    cardImage: "",
    bannerImage: "",
  });
  const pageSize = 10;

  const { data: gamesList } = trpc.admin.games.useQuery(
    { search: search.trim() || undefined, limit: pageSize, offset: page * pageSize },
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
    onSuccess: () => {
      utils.admin.games.invalidate();
      utils.game.list.invalidate();
      utils.game.trending.invalidate();
      utils.game.popular.invalidate();
      setPage(0);
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    setPage(0);
  }, [search]);

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

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex font-terminal">
      <AdminSidebar active="games" />
      <AdminMobileNav active="games" />
      <main className="flex-1 min-w-0">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[10px] text-[#00f0ff] tracking-wider">ARSENAL // CATALOG_MANAGEMENT</p>
              {syncFlowix.data && (
                <p className="text-[9px] text-[#0aff00] mt-1">
                  SYNCED {syncFlowix.data.games} CATALOGS / {syncFlowix.data.products} PRODUCTS
                </p>
              )}
            </div>
            <button
              onClick={() => syncFlowix.mutate()}
              disabled={syncFlowix.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] tracking-wider hover:bg-[#00f0ff]/10 disabled:opacity-50"
            >
              {syncFlowix.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              SYNC_CATALOG
            </button>
          </div>
        </header>
        <div className="p-4 pb-24 sm:p-6 lg:pb-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] text-white/50 tracking-wider">
                CARI GAME FLOWIX LALU EDIT GAMBAR DARI KOLOM IMAGES
              </p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="SEARCH_GAME"
              className="w-full lg:w-72 bg-[#0b0d14] border border-[#222] px-3 py-2 text-xs text-white outline-none focus:border-[#00f0ff]/50"
            />
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
        </div>
      </main>
    </div>
  );
}


