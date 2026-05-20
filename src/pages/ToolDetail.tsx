import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Bot,
  Calculator,
  CheckCircle2,
  Copy,
  Dice5,
  Gauge,
  ListChecks,
  Lock,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  Wand2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { getToolDefinition, resolveToolSlug, toolDefinitions, type ToolDefinition } from "@contracts/toolCatalog";

const wheelColors = ["#ff003c", "#00f0ff", "#ffb800", "#7c3aed", "#0aff00", "#ff6a00"];

function hashPercent(value: string, salt: string) {
  const raw = `${value || "player"}:${salt}`;
  const total = [...raw].reduce((sum, char) => sum + char.charCodeAt(0) * 17, 0);
  return (total % 91) + 9;
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

function cleanResultLine(line: string) {
  return line
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s*/g, "")
    .replace(/^\s*\d+[.)]\s*/g, "")
    .replace(/^\s*[-*•]\s*/g, "")
    .replace(/^\s*\u2022\s*/g, "")
    .trim();
}

function parseNumberInput(value: string, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function parseCustomOptions(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function getDefaultWheelOptions(tool: ToolDefinition | null) {
  if (!tool || tool.kind !== "wheel") return "";
  return tool.modes.filter((item) => item !== "Custom").join("\n");
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

function WheelBoard({
  items,
  rotation,
  isSpinning,
}: {
  items: string[];
  rotation: number;
  isSpinning: boolean;
}) {
  const segmentSize = 360 / Math.max(items.length, 1);
  const gradient = items
    .map((_, index) => {
      const start = index * segmentSize;
      const end = (index + 1) * segmentSize;
      return `${wheelColors[index % wheelColors.length]} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="my-5 grid gap-5 lg:grid-cols-[minmax(240px,340px)_1fr] lg:items-center">
      <div className="relative mx-auto h-72 w-72 sm:h-80 sm:w-80">
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
          <div className="h-0 w-0 border-x-[14px] border-t-[26px] border-x-transparent border-t-white drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
        </div>
        <div
          className="relative h-full w-full rounded-full border-[12px] border-[#151821] shadow-[0_0_80px_rgba(255,0,60,0.18),inset_0_0_42px_rgba(0,0,0,0.5)] transition-transform ease-out"
          style={{
            background: `conic-gradient(${gradient})`,
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? "1800ms" : "450ms",
          }}
        >
          <div className="absolute inset-[12px] rounded-full border border-black/25 shadow-[inset_0_0_30px_rgba(0,0,0,0.25)]" />
          {items.map((item, index) => {
            const angle = ((index * segmentSize + segmentSize / 2 - 90) * Math.PI) / 180;
            const radius = 35;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            return (
              <span
                key={`${item}-${index}`}
                className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-[11px] font-bold text-white shadow-sm"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {index + 1}
              </span>
            );
          })}
          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#050307] text-center font-display text-sm font-bold text-white shadow-[0_0_24px_rgba(0,0,0,0.45)]">
            SPIN
          </div>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Menu aktif</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <div
              key={`${item}-legend-${index}`}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-black"
                style={{ backgroundColor: wheelColors[index % wheelColors.length] }}
              >
                {index + 1}
              </span>
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  toolKind,
}: {
  result: string;
  toolKind: string;
}) {
  const resultLines = result.split("\n").map(cleanResultLine).filter(Boolean);

  if (!result) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-white/10 bg-black/30 p-5 text-center">
        <p className="max-w-xs text-sm leading-relaxed text-white/40">
          Hasil akan muncul di sini setelah kamu generate.
        </p>
      </div>
    );
  }

  if (toolKind === "wheel") {
    return (
      <div className="rounded-xl border border-[#ffb800]/20 bg-[#211600]/35 p-5">
        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#ffb800]">Wheel result</p>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[#ffb800]" />
          <p className="font-display text-3xl font-bold leading-tight text-white">{resultLines[0]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {resultLines.map((line, index) => {
        const [rawLabel, ...rest] = line.split(":");
        const hasLabel = rest.length > 0 && rawLabel.length < 28;
        const value = hasLabel ? rest.join(":").trim() : line;
        const match = line.match(/(\d+)%/);

        return (
          <div key={`${line}-${index}`} className="rounded-xl border border-white/10 bg-black/30 p-4">
            {hasLabel && <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#00f0ff]/70">{rawLabel}</p>}
            <p className={`${index === 0 && !hasLabel ? "font-display text-2xl font-bold text-white" : "text-sm leading-relaxed text-white/82"}`}>
              {value}
            </p>
            {match && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#ff003c] via-[#ffb800] to-[#00f0ff]" style={{ width: `${Math.min(100, Number(match[1]))}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getToolUsageGuide(tool: ToolDefinition) {
  const guides: Record<string, string[]> = {
    "nickname-generator": [
      "Pilih gaya nickname yang kamu mau, misalnya Pro Player, Aesthetic, Jepang, Korea, atau Cyber.",
      "Isi nickname dasar atau kata kunci sebagai bahan inspirasi.",
      "Tekan Generate, lalu copy hasil yang paling cocok untuk dipakai di game.",
    ],
    "squad-name": [
      "Pilih vibe squad seperti Esport, Savage, Anime, atau Cyber.",
      "Isi kata kunci squad kalau ingin hasil yang lebih personal.",
      "Tekan Generate dan pakai hasilnya sebagai nama clan, guild, atau tagline tim.",
    ],
    "trash-talk": [
      "Pilih mode roast yang sesuai suasana mabar.",
      "Masukkan nickname atau konteks singkat kalau ingin hasil lebih spesifik.",
      "Tekan Generate, lalu gunakan hasilnya untuk bercanda dengan tetap santai.",
    ],
    "caption-generator": [
      "Pilih tipe caption, misalnya Kemenangan, Kekalahan, Savage, atau Lucu.",
      "Masukkan momen atau nickname supaya caption lebih nyambung.",
      "Tekan Generate, lalu copy caption untuk story, post, atau short video.",
    ],
    "challenge-wheel": [
      "Lihat pilihan challenge yang tersedia di roda.",
      "Tekan Spin Wheel dan tunggu roda berhenti di pointer atas.",
      "Jalankan challenge yang terpilih untuk match berikutnya.",
    ],
    "punishment-wheel": [
      "Sepakati dulu aturan hukuman dengan party kamu.",
      "Tekan Spin Wheel dan biarkan roda memilih hukuman secara acak.",
      "Pakai hasilnya sebagai hukuman ringan untuk yang kalah atau blunder.",
    ],
    "hero-picker": [
      "Pilih mode game atau kategori random yang ingin dipakai.",
      "Masukkan nickname kalau ingin hasil terasa lebih personal.",
      "Tekan Generate untuk mendapat hero/agent, role, lane, dan difficulty.",
    ],
    "aura-calculator": [
      "Pilih mode aura yang ingin dicek.",
      "Masukkan nickname kamu atau teman mabar.",
      "Tekan Generate untuk melihat persentase aura, hoki, toxic, dan MVP.",
    ],
    "toxic-meter": [
      "Pilih mode Toxic, Savage, atau Noob.",
      "Masukkan nickname target sebagai bahan kalkulasi fun.",
      "Tekan Generate dan gunakan hasilnya sebagai hiburan, bukan penilaian serius.",
    ],
    compatibility: [
      "Masukkan nickname kamu di kolom pertama.",
      "Masukkan nickname duo atau teman squad di kolom kedua.",
      "Tekan Generate untuk melihat chemistry, friendship, dan verdict duo.",
    ],
    "winrate-calculator": [
      "Isi total match yang sudah dimainkan.",
      "Isi winrate saat ini dan target winrate yang ingin dicapai.",
      "Tekan Generate untuk melihat estimasi win beruntun yang dibutuhkan.",
    ],
    "diamond-calculator": [
      "Masukkan jumlah diamond yang ingin dihitung.",
      "Tekan Generate untuk melihat estimasi rupiah.",
      "Cek harga real di katalog topup sebelum checkout.",
    ],
    "magic-wheel": [
      "Masukkan jumlah spin yang ingin disimulasikan.",
      "Tekan Generate untuk melihat estimasi diamond yang dibutuhkan.",
      "Gunakan hasil luck sebagai hiburan sebelum topup.",
    ],
  };

  if (guides[tool.slug]) return guides[tool.slug];

  if (tool.kind === "ai-text") {
    return [
      "Pilih mode output yang paling sesuai kebutuhan kamu.",
      "Isi nickname, prompt, atau kata kunci singkat.",
      "Tekan Generate, lalu copy hasil yang ingin dipakai.",
    ];
  }

  if (tool.kind === "wheel") {
    return [
      "Cek daftar pilihan yang muncul di roda.",
      "Tekan Spin Wheel dan tunggu animasi selesai.",
      "Gunakan hasil yang berhenti di pointer sebagai keputusan final.",
    ];
  }

  return [
    "Pilih mode yang ingin digunakan.",
    "Isi data yang diminta pada form.",
    "Tekan Generate, lalu copy atau share hasilnya.",
  ];
}

export default function ToolDetail() {
  const params = useParams<{ slug: string }>();
  const slug = resolveToolSlug(params.slug || "");
  const tool = getToolDefinition(slug);
  const { isAuthenticated } = useAuth();
  const { mutate: trackTool } = trpc.tools.track.useMutation();
  const generateText = trpc.tools.generateText.useMutation();
  const { data: status } = trpc.tools.status.useQuery(undefined, {
    staleTime: 30_000,
  });
  const [mode, setMode] = useState(tool?.modes[0] || "Random");
  const [name, setName] = useState("");
  const [nameTwo, setNameTwo] = useState("");
  const [result, setResult] = useState("");
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelOptionsText, setWheelOptionsText] = useState(getDefaultWheelOptions(tool));
  const [wins, setWins] = useState("50");
  const [matches, setMatches] = useState("1000");
  const [targetWr, setTargetWr] = useState("60");
  const [diamonds, setDiamonds] = useState("86");
  const [spinCount, setSpinCount] = useState("10");
  const [error, setError] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const isCustomMode = mode === "Custom";
  const requiresLogin = !!tool && !tool.publicAccess;
  const isLocked = requiresLogin && !isAuthenticated;
  const defaultWheelItems = tool?.kind === "wheel" ? tool.modes.filter((item) => item !== "Custom") : [];
  const customWheelItems = tool?.kind === "wheel" ? parseCustomOptions(wheelOptionsText) : [];
  const wheelItems =
    tool?.kind === "wheel"
      ? customWheelItems.length >= 2
        ? customWheelItems
        : defaultWheelItems
      : [];

  useEffect(() => {
    if (!tool) return;
    document.title = tool.seoTitle;
    const description = document.querySelector('meta[name="description"]') ?? document.createElement("meta");
    description.setAttribute("name", "description");
    description.setAttribute("content", tool.seoDescription);
    document.head.appendChild(description);
    trackTool({ slug: tool.slug });
  }, [tool, trackTool]);

  useEffect(() => {
    if (!tool) return;
    setMode(tool.modes[0] || "Random");
    setWheelOptionsText(getDefaultWheelOptions(tool));
    setResult("");
    setError("");
  }, [tool]);

  if (!tool) {
    return (
      <div className="min-h-[100dvh] site-bg text-white">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 pt-32">
          <h1 className="font-display text-3xl font-bold">Tool tidak ditemukan</h1>
          <Link to="/tools" className="mt-4 inline-flex text-[#00f0ff]">Kembali ke tools</Link>
        </div>
      </div>
    );
  }

  if (status?.enabled) {
    return (
      <div className="min-h-[100dvh] site-bg text-white">
        <Navbar />
        <main className="flex min-h-[calc(100dvh-120px)] items-center justify-center px-4 pt-28">
          <section className="max-w-xl rounded-2xl border border-[#ffb800]/25 bg-[#211600]/45 p-7 text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-[#ffb800]" />
            <h1 className="font-display text-3xl font-bold text-white">Tools sedang maintenance</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{status.message}</p>
            <Link to="/tools" className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75">
              Kembali ke tools
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  const runTool = async () => {
    if (isSpinning) return;
    setError("");
    if (isLocked) {
      setShowLoginPopup(true);
      return;
    }

    const effectiveMode = tool.kind === "wheel" ? "Custom Wheel" : isCustomMode && name.trim() ? `Custom: ${name.trim().slice(0, 80)}` : mode;
    const generatePayload = {
      slug: tool.slug,
      mode: effectiveMode,
      prompt: tool.kind === "wheel" ? wheelOptionsText : name,
      nickname: tool.kind === "wheel" ? "" : name,
      nicknameTwo: nameTwo,
    };
    const toolPayload =
      tool.slug === "winrate-calculator"
        ? {
            ...generatePayload,
            matches: parseNumberInput(matches, 1000),
            wins: parseNumberInput(wins, 50),
            targetWr: parseNumberInput(targetWr, 60),
          }
        : tool.slug === "diamond-calculator"
          ? { ...generatePayload, diamonds: parseNumberInput(diamonds, 86) }
          : tool.slug === "magic-wheel"
            ? { ...generatePayload, spinCount: parseNumberInput(spinCount, 10) }
            : generatePayload;

    if (tool.kind !== "wheel") {
      try {
        const response = await generateText.mutateAsync({
          ...toolPayload,
        });
        setResult(response.result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generate gagal. Coba lagi sebentar.");
      }
      return;
    }

    if (wheelItems.length < 2) {
      setError("Isi minimal 2 menu wheel, pisahkan dengan koma atau baris baru.");
      return;
    }

    const selectedIndex = hashPercent(`${wheelOptionsText}:${Date.now()}:${rotation}`, "wheel") % wheelItems.length;
    const selectedValue = wheelItems[selectedIndex];
    const segmentSize = 360 / wheelItems.length;
    const selectedCenter = selectedIndex * segmentSize + segmentSize / 2;
    const fullSpins = 5 * 360;
    const finalAngle = (360 - selectedCenter) % 360;
    setResult("");
    setIsSpinning(true);
    setRotation((current) => {
      const normalized = ((current % 360) + 360) % 360;
      const delta = fullSpins + finalAngle - normalized;
      return current + (delta < fullSpins ? delta + 360 : delta);
    });
    window.setTimeout(() => {
      generateText
        .mutateAsync({
          ...generatePayload,
          selectedValue,
        })
        .then((response) => setResult(response.result))
        .catch((err) => {
          setResult(selectedValue);
          setError(err instanceof Error ? err.message : "Generate gagal, hasil spin tetap dipakai.");
        })
        .finally(() => {
          setIsSpinning(false);
        });
    }, 1850);
  };

  const usageGuide = getToolUsageGuide(tool);

  return (
    <div className="min-h-[100dvh] site-bg text-white">
      <Navbar />
      <main className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,0,60,0.24),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(0,240,255,0.12),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/tools" className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to tools
          </Link>
          {showLoginPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
              <section className="w-full max-w-md rounded-2xl border border-[#ffb800]/25 bg-[#11131a] p-6 shadow-2xl shadow-black/40">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffb800]/25 bg-[#ffb800]/10 text-[#ffb800]">
                  <Lock className="h-7 w-7" />
                </div>
                <h2 className="text-center font-display text-2xl font-bold text-white">Login dulu buat lanjut</h2>
                <p className="mt-3 text-center text-sm leading-relaxed text-white/58">
                  Tool ini khusus member ISIKUY. Masuk atau daftar dulu untuk membuka semua AI tools, calculator, dan hasil fun lainnya.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-[#ff003c] px-5 py-3 text-sm font-semibold text-white">
                    Login
                  </Link>
                  <Link to="/register" className="inline-flex items-center justify-center rounded-xl border border-[#00f0ff]/25 bg-[#00f0ff]/10 px-5 py-3 text-sm font-semibold text-[#00f0ff]">
                    Daftar
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginPopup(false)}
                  className="mt-3 w-full rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/55 hover:text-white"
                >
                  Nanti dulu
                </button>
              </section>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-2xl border border-white/10 bg-[#0b0d14]/88 p-5 sm:p-7">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ff4967]/25 bg-[#ff003c]/10 text-[#ff4967]">
                  {tool.kind === "calculator" ? <Calculator className="h-7 w-7" /> : tool.kind === "meter" ? <Gauge className="h-7 w-7" /> : tool.kind === "wheel" ? <Dice5 className="h-7 w-7" /> : <Bot className="h-7 w-7" />}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]">{tool.category}</p>
                  <h1 className="mt-1 font-display text-3xl font-bold sm:text-5xl">{tool.title}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">{tool.description}</p>
                  {isLocked && (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#ffb800]/20 bg-[#211600]/35 px-4 py-3 text-sm text-[#ffe2a3]">
                      <Lock className="h-4 w-4" />
                      Login diperlukan untuk memainkan tool ini.
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-[#00f0ff]/15 bg-[#06151b]/65 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00f0ff]/25 bg-[#00f0ff]/10 text-[#00f0ff]">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#00f0ff]">Tata Cara</p>
                    <h2 className="font-display text-lg font-bold text-white">Cara Pakai {tool.shortTitle}</h2>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {usageGuide.map((item, index) => (
                    <div key={item} className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff003c] text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-relaxed text-white/65">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {tool.kind === "wheel" ? (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-[10px] uppercase tracking-wider text-white/35">Menu Wheel</label>
                      <button
                        type="button"
                        onClick={() => setWheelOptionsText(getDefaultWheelOptions(tool))}
                        className="rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/10 px-3 py-2 text-xs font-semibold text-[#00f0ff]"
                      >
                        Reset preset
                      </button>
                    </div>
                    <textarea
                      value={wheelOptionsText}
                      onChange={(event) => setWheelOptionsText(event.target.value)}
                      rows={6}
                      placeholder="Tulis menu wheel kamu, satu item per baris. Contoh: No recall, Pistol only, Random hero"
                      className="min-h-36 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-[#00f0ff]/50"
                    />
                    <p className="mt-2 text-xs text-white/40">
                      Minimal 2 menu, maksimal 12. Bisa pakai baris baru atau koma.
                    </p>
                  </div>
                ) : (
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
                )}

                {(["ai-text", "meter", "picker"].includes(tool.kind) || (isCustomMode && tool.kind !== "wheel")) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/35">
                        {tool.kind === "wheel" && isCustomMode ? "Custom options" : "Nickname / Prompt"}
                      </span>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={tool.kind === "wheel" && isCustomMode ? "Contoh: No recall, Pistol only, Random hero" : "Masukkan nickname atau prompt custom"}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                      />
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
                    <input type="number" value={matches} onChange={(event) => setMatches(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Total match" />
                    <input type="number" value={wins} onChange={(event) => setWins(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Current WR" />
                    <input type="number" value={targetWr} onChange={(event) => setTargetWr(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Target WR" />
                  </div>
                )}
                {tool.slug === "diamond-calculator" && (
                  <input type="number" value={diamonds} onChange={(event) => setDiamonds(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Jumlah diamond" />
                )}
                {tool.slug === "magic-wheel" && (
                  <input type="number" value={spinCount} onChange={(event) => setSpinCount(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" placeholder="Jumlah spin" />
                )}

                {tool.kind === "wheel" && <WheelBoard items={wheelItems} rotation={rotation} isSpinning={isSpinning} />}

                <button onClick={runTool} disabled={generateText.isPending || isSpinning} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff003c] to-[#b30029] px-6 py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#ff003c]/25 disabled:opacity-60 sm:w-fit">
                  {generateText.isPending || isSpinning ? <Loader2 className="h-5 w-5 animate-spin" /> : isLocked ? <Lock className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                  {isLocked ? "Login untuk main" : tool.kind === "wheel" ? (isSpinning ? "Spinning..." : "Spin Wheel") : "Generate"}
                </button>
                {error && (
                  <p className="rounded-xl border border-[#ff003c]/25 bg-[#ff003c]/10 px-4 py-3 text-sm text-[#ff6a82]">
                    {error}
                  </p>
                )}
              </div>
            </section>

            <aside className="rounded-2xl border border-[#00f0ff]/15 bg-[#071218]/82 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00f0ff]" />
                <h2 className="font-display text-xl font-bold">Result</h2>
              </div>
              <ResultPanel result={result} toolKind={tool.kind} />
              <ResultActions result={result} />
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
