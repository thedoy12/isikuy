import { Link } from "react-router";
import {
  ArrowUpRight,
  Bot,
  Calculator,
  ChevronRight,
  Dice5,
  Flame,
  Gamepad2,
  Gauge,
  Lock,
  Sparkles,
  Wand2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { toolDefinitions, type ToolDefinition } from "@contracts/toolCatalog";

type ToolWithState = ToolDefinition & { isActive?: boolean };

const categoryIcons: Record<ToolDefinition["category"], React.ElementType> = {
  "AI Text": Bot,
  "Spin Random": Dice5,
  "Fun Viral": Gauge,
  Calculator,
};

function ToolCard({ tool, isAuthenticated }: { tool: ToolDefinition; isAuthenticated: boolean }) {
  const Icon = categoryIcons[tool.category] || Wand2;
  const isLocked = !isAuthenticated && !tool.publicAccess;
  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="group relative grid min-h-[148px] min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(18,21,32,0.94),rgba(9,10,15,0.98))] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all hover:-translate-y-1 hover:border-[#ff4967]/35 hover:bg-[#13060b]/90 sm:min-h-[260px] sm:p-5"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff4967] to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#00f0ff]/10 blur-3xl" />
      <div className="relative flex gap-3 sm:block">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ff4967]/25 bg-[#ff003c]/12 text-[#ff4967] shadow-[0_0_24px_rgba(255,0,60,0.12)] sm:mb-4 sm:h-11 sm:w-11 sm:rounded-xl">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#00f0ff]">{tool.category}</p>
            {tool.trending && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ffb800]/20 bg-[#ffb800]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ffb800]">
                <Flame className="h-3 w-3" />
                HOT
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/50">
                <Lock className="h-3 w-3" />
                LOGIN
              </span>
            )}
          </div>
          <h3 className="font-display text-[1.35rem] font-bold leading-none text-white sm:text-xl">{tool.shortTitle}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/58 sm:line-clamp-3">{tool.description}</p>
        </div>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3 self-end">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {tool.modes.slice(0, 2).map((mode) => (
            <span key={mode} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/55">
              {mode}
            </span>
          ))}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff003c] text-white shadow-[0_0_24px_rgba(255,0,60,0.28)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

export default function Tools() {
  const { isAuthenticated } = useAuth();
  const { data: status } = trpc.tools.status.useQuery(undefined, {
    staleTime: 30_000,
  });
  const { data: liveTools } = trpc.tools.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !status?.enabled,
  });
  const { data: trendingTools } = trpc.tools.trending.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !status?.enabled,
  });
  const tools: ToolWithState[] = (liveTools || toolDefinitions).filter((tool) => (tool as ToolWithState).isActive !== false);
  const grouped = tools.reduce<Record<string, typeof tools>>((acc, tool) => {
    acc[tool.category] = [...(acc[tool.category] || []), tool];
    return acc;
  }, {});

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#030305] text-white">
      <Navbar />
      {status?.enabled ? (
        <main className="flex min-h-[calc(100dvh-120px)] items-center justify-center px-4 pt-28">
          <section className="max-w-xl rounded-2xl border border-[#ffb800]/25 bg-[#211600]/45 p-7 text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-[#ffb800]" />
            <h1 className="font-display text-3xl font-bold text-white">Tools sedang maintenance</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {status.message}
            </p>
            <Link to="/" className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75">
              Kembali ke beranda
            </Link>
          </section>
        </main>
      ) : (
      <main>
        <section className="relative overflow-hidden pt-24 pb-8 sm:pt-32 sm:pb-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(255,0,60,0.25),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(0,240,255,0.12),transparent_24%)]" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,45,77,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,77,0.24) 1px, transparent 1px)", backgroundSize: "58px 58px" }} />
          <div className="relative mx-auto w-full max-w-[22rem] min-w-0 px-4 sm:max-w-7xl sm:px-6 lg:px-8">
            <div className="max-w-3xl min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff003c]/20 bg-[#ff003c]/10 px-3 py-1.5 text-[11px] font-semibold text-white/75 sm:mb-5 sm:px-4 sm:py-2 sm:text-xs">
                <Sparkles className="h-4 w-4 text-[#ff4967]" />
                Mini Gaming Fun Tools
              </div>
              <h1 className="max-w-[11ch] font-display text-[2.45rem] font-bold leading-[0.94] sm:max-w-none sm:text-6xl sm:leading-tight">
                Tools mabar ringan buat konten, challenge, dan kalkulasi rank.
              </h1>
              <p className="mt-4 max-w-full text-sm leading-relaxed text-white/62 sm:mt-5 sm:max-w-2xl sm:text-base">
                Generate nickname, spin hukuman, cek aura, dan hitung winrate. Cepat, fun, mobile-friendly, dan tetap nyambung ke katalog topup ISIKUY.
              </p>
              {!isAuthenticated && (
                <p className="mt-3 max-w-full rounded-2xl border border-[#ffb800]/20 bg-[#211600]/35 px-4 py-3 text-sm leading-relaxed text-[#ffe2a3] sm:max-w-2xl">
                  Beberapa tools random bisa dicoba gratis. Login dulu untuk membuka semua AI tools, calculator, dan fitur fun lainnya.
                </p>
              )}
              <div className="mt-6 grid max-w-full grid-cols-2 gap-3 sm:mt-8 sm:flex sm:max-w-none sm:flex-row">
                <a href="#tools-list" className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff003c] to-[#b30029] px-3 py-3 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(255,0,60,0.22)] sm:flex-none sm:px-6 sm:text-base">
                  <Gamepad2 className="h-5 w-5" />
                  <span className="truncate">Mulai Main</span>
                </a>
                <Link to="/games" className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#00f0ff]/25 bg-[#00f0ff]/10 px-2 py-3 text-sm font-semibold text-[#00f0ff] sm:flex-none sm:px-6 sm:text-base">
                  <span className="truncate">Topup Game</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[22rem] min-w-0 px-4 pb-7 sm:max-w-7xl sm:px-6 sm:pb-8 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#00f0ff]/15 bg-[linear-gradient(135deg,rgba(7,18,24,0.84),rgba(14,8,15,0.78))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.26)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-[#ffb800]" />
                <h2 className="font-display text-xl font-bold">Trending Tools</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
                {tools.length} tools
              </span>
            </div>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {(trendingTools?.length ? trendingTools : tools.filter((tool) => tool.trending)).slice(0, 4).map((tool) => (
                <Link key={tool.slug} to={`/tools/${tool.slug}`} className="flex min-w-[220px] snap-start items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white/78 transition-colors hover:border-[#00f0ff]/30 hover:text-white sm:min-w-0">
                  <span className="line-clamp-1">{tool.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#00f0ff]" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="tools-list" className="mx-auto w-full max-w-[22rem] min-w-0 px-4 pb-24 sm:max-w-7xl sm:px-6 lg:px-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-10 sm:mb-12">
              <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff4967]">Kategori</p>
                  <h2 className="font-display text-2xl font-bold leading-none">{category}</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/52">
                  {items.length} item
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} isAuthenticated={isAuthenticated} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      )}
      <Footer />
    </div>
  );
}
