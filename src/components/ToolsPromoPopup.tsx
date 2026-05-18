import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Sparkles, Wand2, X } from "lucide-react";

const DISMISS_KEY = "isikuy_tools_popup_dismissed_until";

export default function ToolsPromoPopup() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/tools")) {
      setVisible(false);
      return;
    }
    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || "0");
    const timer = window.setTimeout(() => setVisible(Date.now() > dismissedUntil), 1200);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 12 * 60 * 60 * 1000));
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-5 z-[75] mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-[#ff4967]/30 bg-[#0b0509]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_45px_rgba(255,0,60,0.18)] backdrop-blur-xl">
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "linear-gradient(rgba(255,45,77,0.42) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,77,0.32) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
        <button onClick={dismiss} className="absolute right-3 top-3 rounded-lg border border-white/10 bg-black/30 p-2 text-white/50 hover:text-white" aria-label="Tutup tools popup">
          <X className="h-4 w-4" />
        </button>
        <div className="relative pr-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00f0ff]/20 bg-[#00f0ff]/10 px-3 py-1 text-[10px] uppercase tracking-wider text-[#00f0ff]">
            <Sparkles className="h-3 w-3" />
            New Fun Tools
          </div>
          <h2 className="font-display text-2xl font-bold text-white">
            Spin challenge, cek aura, dan bikin nickname gaming.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Mini tools ringan buat mabar, konten, dan kalkulasi winrate.
          </p>
          <div className="mt-4 flex gap-2">
            <Link onClick={dismiss} to="/tools" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff003c] px-4 py-3 text-sm font-bold text-white">
              <Wand2 className="h-4 w-4" />
              Buka Tools
            </Link>
            <button onClick={dismiss} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/55">
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
