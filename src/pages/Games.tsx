import { useState, useEffect } from "react";
import type { ComponentType } from "react";
import { useSearchParams } from "react-router";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { optimizedImagePath } from "@/lib/images";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Sparkles,
  Gamepad2,
  Smartphone,
  Wallet,
  Boxes,
  X,
  ChevronRight,
} from "lucide-react";

type ProductFilter = "game" | "pulsa" | "ewallet" | "digital";

const productFilters: Array<{
  value: ProductFilter;
  label: string;
  icon: ComponentType<{ className?: string }>;
  slugs: string[];
}> = [
  { value: "game", label: "Game", icon: Gamepad2, slugs: ["game", "games", "game-online", "top-up-game", "topup-game", "voucher-game"] },
  { value: "pulsa", label: "Pulsa", icon: Smartphone, slugs: ["pulsa", "pulsa-reguler", "pulsa-transfer"] },
  { value: "ewallet", label: "E-Wallet", icon: Wallet, slugs: ["ewallet", "e-wallet", "e-walet", "e-money", "emoney", "dompet-digital"] },
  { value: "digital", label: "Digital", icon: Boxes, slugs: ["data", "paket-data", "data-internet", "internet", "voucher", "premium", "pln", "token-pln", "listrik", "tagihan", "produk"] },
];

export default function Games() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<ProductFilter | undefined>(
    undefined
  );
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    undefined
  );
  const [showFilters, setShowFilters] = useState(false);

  const trendingParam = searchParams.get("trending") === "true";

  const { data: categories } = trpc.game.categories.useQuery();
  const visibleCategories = selectedType
    ? categories?.filter((category) => {
        const filter = productFilters.find((item) => item.value === selectedType);
        return filter?.slugs.includes(category.slug) ?? true;
      })
    : categories;
  const { data: games, isLoading } = trpc.game.list.useQuery({
    categoryId: selectedCategory,
    categoryGroup: selectedType,
    search: search || undefined,
    trending: trendingParam || undefined,
    limit: 40,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pageTitle = trendingParam ? "Trending Produk" : "Semua Produk";
  const pageSubtitle = trendingParam
    ? "Produk paling populer saat ini"
    : "Pilih game, pulsa, e-wallet, atau produk digital favoritmu";

  const fallbackCover = (name: string) =>
    `https://placehold.co/600x800/09090b/ffffff?text=${encodeURIComponent(name)}`;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#030305]">
      <Navbar />

      {/* Hero Header */}
      <div className="pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d14] to-[#030305]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#ff003c]/5 rounded-full blur-[120px]" />
        <div className="relative z-10 mx-auto w-full max-w-[22rem] px-4 sm:max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#ff003c]">
              {trendingParam ? "Trending" : "Produk"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {trendingParam ? (
                  <TrendingUp className="w-5 h-5 text-[#ff003c]" />
                ) : (
                  <Gamepad2 className="w-5 h-5 text-[#00f0ff]" />
                )}
                <span
                  className={`text-xs font-medium tracking-wider uppercase ${
                    trendingParam ? "text-[#ff003c]" : "text-[#00f0ff]"
                  }`}
                >
                  {trendingParam ? "Hot Right Now" : "Catalog"}
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white">
                {pageTitle}
              </h1>
              <p className="text-sm text-white/50 mt-2">{pageSubtitle}</p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff003c]/50 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-white/30 hover:text-white" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl glass text-sm transition-colors ${
                  showFilters
                    ? "bg-[#ff003c]/20 border-[#ff003c]/30"
                    : "hover:bg-white/10"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>

          <div className="mt-8 flex max-w-full flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedType(undefined);
                setSelectedCategory(undefined);
              }}
              className={`px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
                !selectedType
                  ? "bg-[#ff003c] text-white"
                  : "glass text-white/60 hover:bg-white/10"
              }`}
            >
              Semua
            </button>
            {productFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => {
                    setSelectedType(filter.value);
                    setSelectedCategory(undefined);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
                    selectedType === filter.value
                      ? "bg-[#ff003c] text-white"
                      : "glass text-white/60 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 p-5 glass rounded-xl">
              <div className="flex flex-col gap-4">
                {/* Category Filter */}
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                    Kategori Detail
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory(undefined)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        !selectedCategory
                          ? "bg-[#ff003c] text-white"
                          : "glass text-white/60 hover:bg-white/10"
                      }`}
                    >
                      Semua
                    </button>
                    {visibleCategories?.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedCategory === cat.id
                            ? "bg-[#ff003c] text-white"
                            : "glass text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Games Grid */}
      <div className="mx-auto w-full max-w-[22rem] px-4 pb-24 sm:max-w-7xl sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : games && games.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {games.map((game) => (
              <Link
                key={game.id}
                to={`/games/${game.slug}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
              >
                <img
                  src={optimizedImagePath(game.coverImage || game.cardImage) || fallbackCover(game.name)}
                  alt={game.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-[#ff003c]/0 group-hover:bg-[#ff003c]/10 transition-colors duration-300" />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {game.isTrending && (
                    <div className="flex items-center gap-1 bg-[#ff003c] text-white text-[9px] font-bold px-2 py-0.5 rounded">
                      <TrendingUp className="w-2.5 h-2.5" />
                      HOT
                    </div>
                  )}
                  {game.isNew && (
                    <div className="flex items-center gap-1 bg-[#00f0ff] text-black text-[9px] font-bold px-2 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" />
                      NEW
                    </div>
                  )}
                </div>

                {/* Category Badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-medium text-white/60 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded uppercase">
                    {game.categoryName}
                  </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">
                    {game.categoryName}
                  </p>
                  <h3 className="font-display text-base font-semibold text-white group-hover:text-[#00f0ff] transition-colors leading-tight">
                    {game.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-white/40 mb-2">
              Produk tidak ditemukan
            </h3>
            <p className="text-sm text-white/30">
              Coba kata kunci lain atau reset filter
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
