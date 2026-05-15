import { useRef, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Zap,
  Shield,
  Clock,
  Headphones,
  ChevronRight,
  Star,
  QrCode,
  TrendingUp,
  Flame,
  Sparkles,
  Gamepad2,
  ChevronDown,
} from "lucide-react";

const HERO_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  animationDelay: `${(i % 5) * 0.8}s`,
  animationDuration: `${3 + (i % 4)}s`,
}));

/* ─── Hero Section ─── */
function HeroSection() {
  const { data: banners } = trpc.banner.list.useQuery({ position: "hero" });
  const heroBanner = banners?.[0];
  const featuredProducts = [
    {
      name: "Mobile Legends",
      image: "/aset/mobile-legends.png",
      tag: "Most Played",
      className: "sm:row-span-2",
    },
    { name: "Free Fire", image: "/aset/free-fire.png", tag: "Fast" },
    { name: "Valorant", image: "/aset/valorant.png", tag: "New" },
  ];

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#050307]">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#050307]">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,45,77,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,77,0.24) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent 0 32px, rgba(255,0,60,0.22) 33px, transparent 34px)",
          }}
        />
        {/* Radial Glow */}
        <div className="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_22%_18%,rgba(255,0,60,0.34),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(255,45,77,0.22),transparent_30%),radial-gradient(circle_at_68%_58%,rgba(0,240,255,0.1),transparent_24%)]" />
        <div className="absolute left-0 top-0 h-full w-[52%] bg-[linear-gradient(100deg,rgba(76,0,18,0.74),rgba(5,3,7,0.36)_58%,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#050307] to-transparent" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {HERO_PARTICLES.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#ff003c]/30 rounded-full animate-float"
            style={particle}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-[2] bg-[linear-gradient(110deg,rgba(5,3,7,0.2)_0%,rgba(5,3,7,0.08)_42%,rgba(5,3,7,0.54)_100%)]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-[#ff003c]" />
              <span className="text-xs font-medium text-[#e1f5fe]">
                {heroBanner?.subtitle || "Platform Top-Up Game #1 Indonesia"}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-display text-6xl sm:text-7xl xl:text-8xl font-bold text-white leading-none mb-6">
              ISIKUY
              <span className="block text-gradient text-4xl sm:text-5xl xl:text-6xl mt-2 tracking-[0.18em]">
                TOPUP
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#e1f5fe]/70 max-w-xl mx-auto lg:mx-0 mb-8 font-body leading-relaxed">
              Top up game, pulsa, e-wallet, dan voucher digital dalam satu katalog
              yang rapi. Pilih produk, bayar QRIS, lalu pesanan diproses otomatis.
            </p>

            <div className="mb-9 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { icon: Shield, title: "Pembayaran Aman", desc: "QRIS otomatis" },
                { icon: Clock, title: "Proses Cepat", desc: "Tanpa antri" },
                { icon: Headphones, title: "Bantuan Siaga", desc: "Admin online" },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3 rounded-lg border border-[#ff003c]/20 bg-[#13060b]/70 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <item.icon className="h-4 w-4 shrink-0 text-[#ff4967]" />
                  <div>
                    <p className="text-xs font-semibold text-white">{item.title}</p>
                    <p className="text-[11px] text-white/40">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                to="/games"
                className="group flex items-center gap-3 rounded-lg bg-gradient-to-r from-[#ff003c] via-[#ff3158] to-[#a60027] px-8 py-4 text-base font-semibold text-white shadow-[0_18px_45px_rgba(255,0,60,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[#ff003c]/35"
              >
                <Gamepad2 className="w-5 h-5" />
                Mulai Top Up
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/games?trending=true"
                className="flex items-center gap-3 rounded-lg border border-[#ff003c]/25 bg-[#13060b]/70 px-8 py-4 text-base font-semibold text-white transition-all hover:border-[#ff4967]/50 hover:bg-[#240910]"
              >
                <TrendingUp className="w-5 h-5" />
                Lihat Trending
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
              {[
                { value: "60+", label: "Produk aktif" },
                { value: "4", label: "Kategori" },
                { value: "24/7", label: "Checkout" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-[#ff003c]/18 bg-[#090508]/80 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:text-left">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white">
                    {s.value}
                  </p>
                  <p className="text-xs text-white/40 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden min-h-[520px] lg:-mt-16 lg:block">
            <div className="absolute inset-x-2 -top-8 h-[500px] overflow-hidden rounded-[1.35rem] border border-[#ff4967]/20 bg-[#080407]/88 shadow-[0_30px_90px_rgba(0,0,0,0.58),0_0_70px_rgba(255,0,60,0.14)] backdrop-blur-xl">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_22%_8%,rgba(255,0,60,0.32),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(0,240,255,0.12),transparent_24%)]" />
              <img
                src="/aset/valorant.png"
                alt=""
                className="absolute inset-y-0 right-0 h-full w-[54%] object-cover opacity-20 mix-blend-screen"
              />
              <div className="absolute inset-y-0 right-0 w-[62%] bg-gradient-to-l from-[#050307]/30 via-[#050307]/76 to-[#050307]" />
              <div
                className="absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,55,86,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,55,86,0.42) 1px, transparent 1px)",
                  backgroundSize: "42px 42px",
                }}
              />
              <div className="absolute -right-16 top-28 h-64 w-64 rotate-45 border border-[#ff003c]/20" />
              <div className="absolute -right-8 top-36 h-44 w-44 rotate-45 border border-[#00f0ff]/10" />
            </div>
            <div className="absolute left-8 right-8 -top-3 flex items-center justify-between rounded-xl border border-[#ff4967]/18 bg-black/45 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#ff4967]">Live Catalog</p>
                <p className="font-display text-xl font-bold text-white">Pilih produk favorit</p>
              </div>
              <span className="rounded-full border border-[#0aff00]/20 bg-[#0aff00]/10 px-3 py-1 text-xs font-semibold text-[#0aff00]">
                Online
              </span>
            </div>

            <div className="absolute left-8 right-8 top-16 grid h-[260px] grid-cols-[1.18fr_0.82fr] grid-rows-2 gap-4">
              {featuredProducts.map((product) => (
                <Link
                  key={product.name}
                  to="/games"
                  className={`group relative overflow-hidden rounded-xl border border-[#ff4967]/25 bg-[#12060b] shadow-[0_12px_40px_rgba(0,0,0,0.34)] ${
                    product.className || ""
                  }`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/18 to-transparent" />
                  <div className="absolute inset-0 opacity-0 ring-1 ring-inset ring-[#ff4967]/60 transition-opacity group-hover:opacity-100" />
                  <div className="absolute left-3 right-3 top-3 flex justify-end">
                    <span className="rounded bg-[#ff003c]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                      {product.tag}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#ff6a82]">
                      Featured
                    </p>
                    <p className="font-display text-xl font-semibold leading-tight text-white">
                      {product.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="absolute bottom-16 left-8 right-8 overflow-hidden rounded-xl border border-[#ff4967]/22 bg-[#0d0509]/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,transparent_0%,rgba(255,0,60,0.18)_48%,transparent_49%)]" />
              <div className="relative flex items-center justify-between gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#ff6a82]">
                    Battle-ready checkout
                  </p>
                  <p className="mt-2 max-w-sm font-display text-xl font-bold leading-tight text-white">
                    Top up cepat, katalog rapi, pembayaran otomatis.
                  </p>
                </div>
                <div className="grid w-[300px] shrink-0 grid-cols-3 gap-2">
                  {[
                    { icon: Gamepad2, label: "60+ Game" },
                    { icon: QrCode, label: "QRIS" },
                    { icon: Zap, label: "Instant" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-center"
                    >
                      <item.icon className="mx-auto mb-2 h-4 w-4 text-[#ff4967]" />
                      <p className="text-[11px] font-semibold text-white/75">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Trending Games ─── */
function TrendingSection() {
  const { data: trendingGames, isLoading } = trpc.game.trending.useQuery();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#0b0d14] to-[#030305]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-[#ff003c]" />
              <span className="text-xs font-medium text-[#ff003c] tracking-wider uppercase">
                Hot Right Now
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Trending Games
            </h2>
          </div>
          <Link
            to="/games?trending=true"
            className="hidden sm:flex items-center gap-2 text-sm text-[#00f0ff] hover:underline"
          >
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {trendingGames?.map((game) => (
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
                {game.isNew && (
                  <div className="absolute top-3 left-3 bg-[#00f0ff] text-black text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    New
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-xs text-white/50 mb-1">{game.categoryName}</p>
                  <h3 className="font-display text-lg font-semibold text-white group-hover:text-[#00f0ff] transition-colors">
                    {game.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Popular Games Carousel ─── */
function PopularSection() {
  const { data: popularGames, isLoading } = trpc.game.popular.useQuery();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-[#030305]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-[#ffb800]" />
              <span className="text-xs font-medium text-[#ffb800] tracking-wider uppercase">
                Most Popular
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Popular Games
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-64 aspect-[3/4] rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {popularGames?.map((game) => (
                <Link
                  key={game.id}
                  to={`/games/${game.slug}`}
                  className="group flex-shrink-0 w-56 sm:w-64 snap-start"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3">
                    <img
                      src={game.coverImage || ""}
                      alt={game.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                      <Star className="w-3 h-3 text-[#ffb800] fill-[#ffb800]" />
                      <span className="text-[10px] text-white font-medium">
                        4.9
                      </span>
                    </div>
                  </div>
                  <h3 className="font-display text-base font-semibold text-white group-hover:text-[#00f0ff] transition-colors truncate">
                    {game.name}
                  </h3>
                  <p className="text-xs text-white/40">{game.categoryName}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Promo Banners ─── */
function PromoSection() {
  const { data: promoBanners } = trpc.banner.list.useQuery({ position: "promo" });

  return (
    <section className="relative py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#0b0d14]/50 to-[#030305]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoBanners?.slice(0, 2).map((banner) => (
            <div
              key={banner.id}
              className="relative rounded-2xl overflow-hidden group cursor-pointer"
              style={{ backgroundColor: banner.bgColor || "#11131a" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              <div className="relative p-8">
                <h3
                  className="font-display text-2xl font-bold mb-2"
                  style={{ color: banner.textColor || "#ffffff" }}
                >
                  {banner.title}
                </h3>
                <p
                  className="text-sm opacity-80 mb-4"
                  style={{ color: banner.textColor || "#ffffff" }}
                >
                  {banner.subtitle}
                </p>
                <button className="flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                  style={{ color: banner.textColor || "#ffffff" }}
                >
                  Lihat Detail <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Why Choose Us ─── */
function WhyChooseSection() {
  const features = [
    {
      icon: Zap,
      title: "Proses Cepat",
      desc: "Top up masuk dalam hitungan menit, otomatis 24/7 tanpa antri.",
    },
    {
      icon: Shield,
      title: "100% Aman",
      desc: "Enkripsi SSL 256-bit, transaksi terlindungi dan terverifikasi.",
    },
    {
      icon: Clock,
      title: "Always Online",
      desc: "Layanan top up tersedia kapan saja, siang maupun malam.",
    },
    {
      icon: Headphones,
      title: "Support 24/7",
      desc: "Tim support siap membantu kapan pun Anda butuhkan.",
    },
  ];

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-[#030305]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-medium text-[#ff003c] tracking-wider uppercase">
            Keunggulan
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
            Kenapa Pilih ISIKUY?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 group hover:border-[#ff003c]/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff003c]/20 to-[#ff003c]/5 flex items-center justify-center mb-4 group-hover:from-[#ff003c]/30 group-hover:to-[#ff003c]/10 transition-all">
                <f.icon className="w-6 h-6 text-[#ff003c]" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Payment Methods ─── */
function PaymentSection() {
  const { data: methods } = trpc.payment.methods.useQuery();
  const qrisMethod = methods?.find((m) => m.code === "qris") ?? methods?.[0];
  const fee = qrisMethod ? parseFloat(qrisMethod.feePercent ?? "0") : 0;

  return (
    <section className="relative py-20 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#0b0d14] to-[#030305]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-medium text-[#00f0ff] tracking-wider uppercase">
            Pembayaran
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
            Pembayaran QRIS
          </h2>
          <p className="text-sm text-white/50 mt-3 max-w-lg mx-auto">
            Satu metode pembayaran yang praktis untuk e-wallet dan mobile banking
          </p>
        </div>

        <div className="mx-auto max-w-3xl glass rounded-2xl border border-[#00f0ff]/15 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-[#00f0ff]/25 bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_40px_rgba(0,240,255,0.12)]">
              <QrCode className="h-12 w-12" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h3 className="font-display text-2xl font-bold text-white">
                  {qrisMethod?.name ?? "QRIS"}
                </h3>
                <span className="rounded-full border border-[#0aff00]/25 bg-[#0aff00]/10 px-3 py-1 text-xs font-medium text-[#0aff00]">
                  Aktif
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Scan kode QR saat checkout dan bayar dari aplikasi yang
                mendukung QRIS. Status pembayaran akan diperbarui otomatis
                setelah transaksi diterima.
              </p>
              <div className="mt-5 grid gap-3 text-xs text-white/50 sm:grid-cols-3">
                <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className="block text-white/80">Metode</span>
                  QRIS
                </div>
                <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className="block text-white/80">Biaya</span>
                  {fee > 0 ? `${fee}%` : "Tanpa biaya"}
                </div>
                <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className="block text-white/80">Status</span>
                  Otomatis
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  const testimonials = [
    {
      name: "Ahmad Rizky",
      role: "Mobile Legends Player",
      text: "Top up ML di ISIKUY paling cepat! Diamonds masuk dalam 1 menit. Harga juga paling murah dibanding yang lain.",
      rating: 5,
    },
    {
      name: "Dewi Lestari",
      role: "Genshin Impact Player",
      text: "Sudah berkali-kali top up Genshin di sini, never disappoint. Proses otomatis dan aman. Recommended banget!",
      rating: 5,
    },
    {
      name: "Budi Santoso",
      role: "Free Fire Player",
      text: "Pelayanan customer service sangat responsif. Pernah ada masalah dan langsung diselesaikan. Top markotop!",
      rating: 5,
    },
  ];

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-[#030305]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-medium text-[#ffb800] tracking-wider uppercase">
            Testimoni
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
            Apa Kata Mereka?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-[#ffb800] fill-[#ffb800]"
                  />
                ))}
              </div>
              <p className="text-sm text-white/70 leading-relaxed mb-5">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff003c] to-[#b30029] flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {t.name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/40">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ Accordion ─── */
function FAQSection() {
  const { data: faqs } = trpc.faq.list.useQuery();
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#0b0d14] to-[#030305]" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-medium text-[#00f0ff] tracking-wider uppercase">
            FAQ
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
            Pertanyaan Umum
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs?.map((faq) => (
            <div
              key={faq.id}
              className="glass rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="text-sm font-medium text-white pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#ff003c] flex-shrink-0 transition-transform ${
                    openId === faq.id ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openId === faq.id && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-white/60 leading-relaxed border-t border-white/5 pt-4">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Marquee ─── */
function MarqueeSection() {
  const items = [
    "MOBILE LEGENDS",
    "PUBG MOBILE",
    "FREE FIRE",
    "VALORANT",
    "GENSHIN IMPACT",
    "ROBLOX",
    "WILD RIFT",
    "HONOR OF KINGS",
  ];

  return (
    <section className="py-8 overflow-hidden border-y border-white/5">
      <div className="flex animate-marquee-left whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span
            key={i}
            className="mx-8 font-display text-2xl font-bold text-white/10 tracking-wider"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─── Home Page ─── */
export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-[#030305]">
      <Navbar />
      <main>
        <HeroSection />
        <MarqueeSection />
        <TrendingSection />
        <PopularSection />
        <PromoSection />
        <WhyChooseSection />
        <PaymentSection />
        <TestimonialsSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
