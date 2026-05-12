import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Sparkles,
  Gamepad2,
  X,
  ChevronRight,
} from "lucide-react";

export default function Games() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    undefined
  );
  const [selectedPlatform, setSelectedPlatform] = useState<string | undefined>(
    undefined
  );
  const [showFilters, setShowFilters] = useState(false);

  const trendingParam = searchParams.get("trending") === "true";

  const { data: categories } = trpc.game.categories.useQuery();
  const { data: games, isLoading } = trpc.game.list.useQuery({
    categoryId: selectedCategory,
    search: search || undefined,
    platform: selectedPlatform,
    trending: trendingParam || undefined,
    limit: 50,
  });

  const platforms = [
    { value: "mobile", label: "Mobile" },
    { value: "pc", label: "PC" },
    { value: "voucher", label: "Voucher" },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pageTitle = trendingParam ? "Trending Games" : "Semua Game";
  const pageSubtitle = trendingParam
    ? "Game paling populer saat ini"
    : "Temukan game favoritmu dan top up sekarang";

  return (
    <div className="min-h-[100dvh] bg-[#030305]">
      <Navbar />

      {/* Hero Header */}
      <div className="pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d14] to-[#030305]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#ff003c]/5 rounded-full blur-[120px]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#ff003c]">
              {trendingParam ? "Trending" : "Games"}
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
                  placeholder="Cari game..."
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

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 p-5 glass rounded-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Category Filter */}
                <div className="flex-1">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                    Kategori
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
                    {categories?.map((cat) => (
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

                {/* Platform Filter */}
                <div className="flex-1">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                    Platform
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedPlatform(undefined)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        !selectedPlatform
                          ? "bg-[#00f0ff] text-black"
                          : "glass text-white/60 hover:bg-white/10"
                      }`}
                    >
                      Semua
                    </button>
                    {platforms.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setSelectedPlatform(p.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedPlatform === p.value
                            ? "bg-[#00f0ff] text-black"
                            : "glass text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {p.label}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : games && games.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {games.map((game) => (
              <Link
                key={game.id}
                to={`/games/${game.slug}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
              >
                <img
                  src={game.coverImage || ""}
                  alt={game.name}
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

                {/* Platform Badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-medium text-white/60 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded uppercase">
                    {game.platform}
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
                  <p className="text-[10px] text-white/30 mt-1">
                    {game.publisher}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-white/40 mb-2">
              Game tidak ditemukan
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
