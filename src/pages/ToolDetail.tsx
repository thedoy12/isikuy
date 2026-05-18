import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Bot,
  Calculator,
  Copy,
  Dice5,
  Download,
  Gauge,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { trpc } from "@/providers/trpc";
import { getToolDefinition, resolveToolSlug, toolDefinitions } from "@contracts/toolCatalog";

const heroPool = ["Layla", "Gusion", "Fanny", "Chou", "Lancelot", "Miya", "Tigreal", "Angela"];
const agentPool = ["Jett", "Reyna", "Sova", "Killjoy", "Raze", "Omen", "Sage", "Phoenix"];
const lanePool = ["EXP Lane", "Gold Lane", "Mid Lane", "Jungle", "Roam"];
const difficultyPool = ["Easy", "Normal", "Hard", "Nightmare"];
const rankPool = ["Mythic Glory", "Radiant", "Immortal", "Legend", "Mythical Honor"];

function hashPercent(value: string, salt: string) {
  const raw = `${value}:${salt}` || "player";
  const total = [...raw].reduce((sum, char) => sum + char.charCodeAt(0) * 17, 0);
  return (total % 91) + 9;
}

function pick<T>(items: T[], salt: string) {
  return items[hashPercent(salt, "pick") % items.length];
}

function copyText(value: string) {
  navigator.clipboard?.writeText(value);
}

function shareText(value: string) {
  if (navigator.share) {
    navigator.share({ text: value, title: "ISIKUY Tools" }).catch(() => undefined);
    return;
  }
  copyText(value);
}

function downloadCard(title: string, lines: string[]) {
  const safeTitle = title.replace(/[&<>]/g, "");
  const body = lines.map((line, index) => `<text x="48" y="${170 + index * 42}" fill="#ffffff" font-size="28" font-family="Arial">${line.replace(/[&<>]/g, "")}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520"><rect width="900" height="520" fill="#050307"/><rect x="24" y="24" width="852" height="472" rx="28" fill="#11131a" stroke="#ff003c"/><text x="48" y="92" fill="#00f0ff" font-size="24" font-family="Arial">ISIKUY TOOLS</text><text x="48" y="136" fill="#ffffff" font-size="44" font-weight="700" font-family="Arial">${safeTitle}</text>${body}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

function ResultActions({ result }: { result: string }) {
  if (!result) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button onClick={() => copyText(result)} className="inline-flex items-center gap-2 rounded-lg border border-[#00f0ff]/25 bg-[#00f0ff]/10 px-4 py-2 text-sm text-[#00f0ff]">
        <Copy className="h-4 w-4" />
        Copy
      </button>
      <button onClick={() => shareText(result)} className="inline-flex items-center gap-2 rounded-lg border border-[#ff4967]/25 bg-[#ff003c]/10 px-4 py-2 text-sm text-[#ff6a82]">
        <Share2 className="h-4 w-4" />
        Share
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(result)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#0aff00]/25 bg-[#0aff00]/10 px-4 py-2 text-sm text-[#0aff00]">
        WhatsApp
      </a>
    </div>
  );
}

export default function ToolDetail() {
  const params = useParams<{ slug: string }>();
  const slug = resolveToolSlug(params.slug || "");
  const tool = getToolDefinition(slug);
  const trackTool = trpc.tools.track.useMutation();
  const generateText = trpc.tools.generateText.useMutation();
  const [mode, setMode] = useState(tool?.modes[0] || "Random");
  const [name, setName] = useState("");
  const [nameTwo, setNameTwo] = useState("");
  const [result, setResult] = useState("");
  const [rotation, setRotation] = useState(0);
  const [wins, setWins] = useState(500);
  const [matches, setMatches] = useState(1000);
  const [targetWr, setTargetWr] = useState(60);
  const [diamonds, setDiamonds] = useState(86);
  const [spinCount, setSpinCount] = useState(10);

  useEffect(() => {
    if (!tool) return;
    document.title = tool.seoTitle;
    const description = document.querySelector('meta[name="description"]') ?? document.createElement("meta");
    description.setAttribute("name", "description");
    description.setAttribute("content", tool.seoDescription);
    document.head.appendChild(description);
    trackTool.mutate({ slug: tool.slug });
  }, [tool?.slug]);

  const winrateNeeded = useMemo(() => {
    const currentWins = Math.round(matches * (wins / 100));
    let needed = 0;
    while (((currentWins + needed) / (matches + needed)) * 100 < targetWr && needed < 10000) needed += 1;
    return needed;
  }, [matches, targetWr, wins]);

  if (!tool) {
    return (
      <div className="min-h-[100dvh] bg-[#030305] text-white">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 pt-32">
          <h1 className="font-display text-3xl font-bold">Tool tidak ditemukan</h1>
          <Link to="/tools" className="mt-4 inline-flex text-[#00f0ff]">Kembali ke tools</Link>
        </div>
      </div>
    );
  }

  const runTool = async () => {
    if (tool.kind === "ai-text") {
      const response = await generateText.mutateAsync({
        slug: tool.slug,
        mode,
        prompt: name,
        nickname: name,
      });
      setResult(response.result);
      return;
    }

    if (tool.kind === "wheel") {
      const value = pick(tool.modes, `${mode}:${Date.now()}`);
      setRotation((current) => current + 720 + hashPercent(value, "wheel") * 5);
      setTimeout(() => setResult(value), 500);
      return;
    }

    if (tool.kind === "picker") {
      const isValorant = mode === "Valorant";
      const picked = isValorant ? pick(agentPool, name + Date.now()) : pick(heroPool, name + Date.now());
      setResult(`${picked}\nRole: ${pick(["Tank", "Mage", "Marksman", "Duelist", "Sentinel"], picked)}\nLane: ${pick(lanePool, picked)}\nDifficulty: ${pick(difficultyPool, picked)}`);
      return;
    }

    if (tool.kind === "meter") {
      const target = `${name}:${nameTwo}:${Date.now()}`;
      if (tool.slug === "compatibility") {
        setResult(`Chemistry ${hashPercent(target, "chem")}%\nFriendship ${hashPercent(target, "friend")}%\nVerdict: ${hashPercent(target, "duo") > 55 ? "Cocok buat duo rank" : "Cocoknya warm up dulu"}`);
      } else if (tool.slug === "toxic-meter") {
        setResult(`Toxic Score ${hashPercent(target, "toxic")}%\nSavage Level ${hashPercent(target, "savage")}%\nNoob Percentage ${hashPercent(target, "noob")}%`);
      } else {
        setResult(`Aura ${hashPercent(target, "aura")}%\nHoki ${hashPercent(target, "hoki")}%\nToxic ${hashPercent(target, "toxic")}%\nMVP ${hashPercent(target, "mvp")}%`);
      }
      return;
    }

    if (tool.slug === "winrate-calculator") {
      setResult(`Butuh ${winrateNeeded.toLocaleString()} win beruntun untuk target ${targetWr}% WR.`);
      return;
    }
    if (tool.slug === "diamond-calculator") {
      setResult(`${diamonds.toLocaleString()} diamond kira-kira Rp${Math.round(diamonds * 265).toLocaleString("id-ID")}.\nCek harga real di katalog topup sebelum checkout.`);
      return;
    }
    if (tool.slug === "magic-wheel") {
      setResult(`${spinCount} spin butuh estimasi ${spinCount * 60} diamond.\nLuck hari ini: ${hashPercent(String(spinCount), "luck")}%`);
      return;
    }

    const kda = `${hashPercent(name, "kill") % 25}/${hashPercent(name, "death") % 7}/${hashPercent(name, "assist") % 30}`;
    if (tool.slug === "fake-rank") {
      setResult(`${name || "Player"}\nRank: ${pick(rankPool, name + mode)}\nWin Streak: ${hashPercent(name, "ws") % 18}`);
    } else {
      setResult(`${name || "Player"} MVP\nKDA: ${kda}\nDamage: ${hashPercent(name, "damage")}%\nTeamfight: ${hashPercent(name, "fight")}%`);
    }
  };

  const resultLines = result.split("\n").filter(Boolean);

  return (
    <div className="min-h-[100dvh] bg-[#030305] text-white">
      <Navbar />
      <main className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,0,60,0.24),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(0,240,255,0.12),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/tools" className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to tools
          </Link>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-2xl border border-white/10 bg-[#0b0d14]/88 p-5 sm:p-7">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ff4967]/25 bg-[#ff003c]/10 text-[#ff4967]">
                  {tool.kind === "calculator" ? <Calculator className="h-7 w-7" /> : tool.kind === "meter" ? <Gauge className="h-7 w-7" /> : tool.kind === "wheel" ? <Dice5 className="h-7 w-7" /> : tool.kind === "fake-card" ? <Trophy className="h-7 w-7" /> : <Bot className="h-7 w-7" />}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]">{tool.category}</p>
                  <h1 className="mt-1 font-display text-3xl font-bold sm:text-5xl">{tool.title}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">{tool.description}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-wider text-white/35">Mode</label>
                  <div className="flex flex-wrap gap-2">
                    {tool.modes.map((item) => (
                      <button key={item} onClick={() => setMode(item)} className={`rounded-lg border px-3 py-2 text-xs ${mode === item ? "border-[#ff003c] bg-[#ff003c]/15 text-white" : "border-white/10 bg-white/[0.03] text-white/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {["ai-text", "meter", "fake-card", "picker"].includes(tool.kind) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/35">Nickname / Prompt</span>
                      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Masukkan nickname" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50" />
                    </label>
                    {tool.slug === "compatibility" && (
                      <label>
                        <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/35">Nickname 2</span>
                        <input value={nameTwo} onChange={(event) => setNameTwo(event.target.value)} placeholder="Nickname duo" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50" />
                      </label>
                    )}
                  </div>
                )}

                {tool.slug === "winrate-calculator" && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input type="number" value={matches} onChange={(event) => setMatches(Number(event.target.value))} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Total match" />
                    <input type="number" value={wins} onChange={(event) => setWins(Number(event.target.value))} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Current WR" />
                    <input type="number" value={targetWr} onChange={(event) => setTargetWr(Number(event.target.value))} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Target WR" />
                  </div>
                )}
                {tool.slug === "diamond-calculator" && (
                  <input type="number" value={diamonds} onChange={(event) => setDiamonds(Number(event.target.value))} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Jumlah diamond" />
                )}
                {tool.slug === "magic-wheel" && (
                  <input type="number" value={spinCount} onChange={(event) => setSpinCount(Number(event.target.value))} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Jumlah spin" />
                )}

                {tool.kind === "wheel" && (
                  <div className="mx-auto my-3 flex h-56 w-56 items-center justify-center rounded-full border-4 border-[#ff4967]/40 bg-[conic-gradient(from_0deg,#ff003c,#00f0ff,#ffb800,#0aff00,#ff003c)] p-3 shadow-[0_0_60px_rgba(255,0,60,0.16)] transition-transform duration-700" style={{ transform: `rotate(${rotation}deg)` }}>
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#050307] text-center font-display text-xl font-bold">
                      SPIN
                    </div>
                  </div>
                )}

                <button onClick={runTool} disabled={generateText.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff003c] to-[#b30029] px-6 py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#ff003c]/25 disabled:opacity-60 sm:w-fit">
                  {generateText.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                  Generate
                </button>
              </div>
            </section>

            <aside className="rounded-2xl border border-[#00f0ff]/15 bg-[#071218]/82 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00f0ff]" />
                <h2 className="font-display text-xl font-bold">Result</h2>
              </div>
              <div className="min-h-48 rounded-xl border border-white/10 bg-black/30 p-5">
                {result ? (
                  <div className="space-y-3">
                    {resultLines.map((line) => {
                      const match = line.match(/(\d+)%/);
                      return (
                        <div key={line}>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{line}</p>
                          {match && (
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#ff003c] to-[#00f0ff]" style={{ width: `${Math.min(100, Number(match[1]))}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-white/40">
                    Hasil akan muncul di sini. Gunakan untuk konten mabar, bio, caption, atau challenge ringan.
                  </p>
                )}
              </div>
              <ResultActions result={result} />
              {tool.kind === "fake-card" && result && (
                <button onClick={() => downloadCard(tool.shortTitle, resultLines)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#ffb800]/25 bg-[#ffb800]/10 px-4 py-2 text-sm text-[#ffb800]">
                  <Download className="h-4 w-4" />
                  Download Card
                </button>
              )}
              <Link to={`/games/${tool.ctaGameSlug || "mobile-legends"}`} className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-[#ff003c]/25 bg-[#ff003c]/10 px-5 py-3 text-sm font-semibold text-[#ff6a82]">
                Topup setelah mabar
              </Link>
            </aside>
          </div>

          <section className="mt-10">
            <h2 className="mb-4 font-display text-2xl font-bold">Tools lainnya</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {toolDefinitions.filter((item) => item.slug !== tool.slug).slice(0, 4).map((item) => (
                <Link key={item.slug} to={`/tools/${item.slug}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65 hover:text-white">
                  <Wand2 className="mb-2 h-4 w-4 text-[#ff4967]" />
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
