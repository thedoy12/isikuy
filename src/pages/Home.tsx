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
  Wallet,
  CreditCard,
  Landmark,
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

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#030305]">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,0,60,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,60,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff003c]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#00f0ff]/3 rounded-full blur-[150px]" />
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

      {/* Content */}
      <img
        src="/games/maskot.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-4rem] right-1/2 z-[1] w-[560px] translate-x-1/2 opacity-[0.16] blur-[0.2px] drop-shadow-[0_35px_90px_rgba(0,240,255,0.22)] sm:w-[680px] lg:bottom-[-7rem] lg:right-[-3rem] lg:w-[760px] lg:translate-x-0 lg:opacity-[0.22] xl:right-[-1rem] xl:w-[880px]"
      />
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_70%_58%,transparent_0%,rgba(3,3,5,0.22)_38%,rgba(3,3,5,0.78)_72%)]" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8">
          <Sparkles className="w-4 h-4 text-[#ff003c]" />
          <span className="text-xs font-medium text-[#e1f5fe]">
            {heroBanner?.subtitle || "Platform Top-Up Game #1 Indonesia"}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="font-display text-6xl sm:text-8xl lg:text-[120px] font-bold text-white leading-none mb-6">
          ISIKUY
          <span className="block text-gradient text-4xl sm:text-5xl lg:text-6xl mt-2 tracking-[0.2em]">
            TOPUP
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-[#e1f5fe]/70 max-w-2xl mx-auto mb-10 font-body">
          Top up diamonds, UC, dan game currency favoritmu dengan harga
          terbaik. Proses cepat, aman, dan terpercaya.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/games"
            className="group flex items-center gap-3 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white px-8 py-4 rounded-xl text-base font-semibold hover:shadow-lg hover:shadow-[#ff003c]/25 transition-all"
          >
            <Gamepad2 className="w-5 h-5" />
            Mulai Top Up
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/games?trending=true"
            className="flex items-center gap-3 glass text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/10 transition-all"
          >
            <TrendingUp className="w-5 h-5" />
            Lihat Trending
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: "500K+", label: "Transaksi" },
            { value: "16+", label: "Game" },
            { value: "<3m", label: "Proses" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl sm:text-3xl font-bold text-white">
                {s.value}
              </p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
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

  const iconMap: Record<string, React.ReactNode> = {
    qris: <QrCode className="w-8 h-8" />,
    ewallet: <Wallet className="w-8 h-8" />,
    va: <Landmark className="w-8 h-8" />,
    saldo: <CreditCard className="w-8 h-8" />,
  };

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#0b0d14] to-[#030305]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-medium text-[#00f0ff] tracking-wider uppercase">
            Pembayaran
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
            Metode Pembayaran
          </h2>
          <p className="text-sm text-white/50 mt-3 max-w-lg mx-auto">
            Berbagai metode pembayaran yang aman dan nyaman
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {methods?.map((m) => (
            <div
              key={m.id}
              className="glass rounded-xl p-5 flex flex-col items-center gap-3 hover:bg-white/5 transition-colors group"
            >
              <div className="text-white/60 group-hover:text-[#00f0ff] transition-colors">
                {iconMap[m.type] || <Wallet className="w-8 h-8" />}
              </div>
              <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                {m.name}
              </span>
            </div>
          ))}
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
