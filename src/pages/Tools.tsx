import { Link } from "react-router";
import {
  Bot,
  Calculator,
  ChevronRight,
  Dice5,
  Flame,
  Gamepad2,
  Gauge,
  Sparkles,
  Wand2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { trpc } from "@/providers/trpc";
import { toolDefinitions, type ToolDefinition } from "@contracts/toolCatalog";

type ToolWithState = ToolDefinition & { isActive?: boolean };

const categoryIcons: Record<ToolDefinition["category"], React.ElementType> = {
  "AI Text": Bot,
  "Spin Random": Dice5,
  "Fun Viral": Gauge,
  Calculator,
};

function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = categoryIcons[tool.category] || Wand2;
  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d14]/88 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:-translate-y-1 hover:border-[#ff4967]/35 hover:bg-[#13060b]/90"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff4967] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ff4967]/20 bg-[#ff003c]/10 text-[#ff4967]">
          <Icon className="h-5 w-5" />
        </div>
        {tool.trending && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#ffb800]/20 bg-[#ffb800]/10 px-2 py-1 text-[10px] text-[#ffb800]">
            <Flame className="h-3 w-3" />
            HOT
          </span>
        )}
      </div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#00f0ff]">{tool.category}</p>
      <h3 className="font-display text-xl font-bold text-white">{tool.shortTitle}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/50">{tool.description}</p>
      <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#ff4967]">
        Buka tool <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function Tools() {
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
    <div className="min-h-[100dvh] bg-[#030305] text-white">
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
        <section className="relative overflow-hidden pt-32 pb-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(255,0,60,0.25),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(0,240,255,0.12),transparent_24%)]" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,45,77,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,77,0.24) 1px, transparent 1px)", backgroundSize: "58px 58px" }} />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-2 text-xs text-white/75">
                <Sparkles className="h-4 w-4 text-[#ff4967]" />
                Mini Gaming Fun Tools
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
                Tools mabar ringan buat konten, challenge, dan kalkulasi rank.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/58">
                Generate nickname, spin hukuman, cek aura, dan hitung winrate. Cepat, fun, mobile-friendly, dan tetap nyambung ke katalog topup ISIKUY.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#tools-list" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff003c] to-[#b30029] px-6 py-3 font-semibold text-white">
                  <Gamepad2 className="h-5 w-5" />
                  Mulai Main
                </a>
                <Link to="/games" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00f0ff]/25 bg-[#00f0ff]/10 px-6 py-3 font-semibold text-[#00f0ff]">
                  Topup Game
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#00f0ff]/15 bg-[#071218]/70 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-[#ffb800]" />
              <h2 className="font-display text-xl font-bold">Trending Tools</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(trendingTools?.length ? trendingTools : tools.filter((tool) => tool.trending)).slice(0, 4).map((tool) => (
                <Link key={tool.slug} to={`/tools/${tool.slug}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75 transition-colors hover:border-[#00f0ff]/30 hover:text-white">
                  {tool.title}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="tools-list" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-12">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <h2 className="font-display text-2xl font-bold">{category}</h2>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
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
