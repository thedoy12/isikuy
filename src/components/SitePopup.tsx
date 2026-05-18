import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { X, Zap } from "lucide-react";
import { trpc } from "@/providers/trpc";
import BrandLogo from "@/components/BrandLogo";

const DISMISS_KEY = "isikuy_popup_dismissed_until";

export default function SitePopup() {
  const location = useLocation();
  const { data: settings } = trpc.site.publicSettings.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!settings?.popupEnabled || location.pathname.startsWith("/admin")) {
      setVisible(false);
      return;
    }

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || "0");
    setVisible(Date.now() > dismissedUntil);
  }, [settings, location.pathname]);

  if (!settings?.popupEnabled || location.pathname.startsWith("/admin") || !visible) return null;

  const dismiss = () => {
    const hours = Math.max(1, settings.popupDismissHours || 24);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + hours * 60 * 60 * 1000));
    setVisible(false);
  };
  const isExternalButton = /^https?:\/\//i.test(settings.popupButtonUrl);
  const buttonClassName =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff003c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#b30029]";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#ff4967]/30 bg-[#0b0509] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_70px_rgba(255,0,60,0.18)]">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,45,77,0.42) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,77,0.32) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 bg-black/30 p-2 text-white/60 transition-colors hover:text-white"
          aria-label="Tutup popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative">
          <BrandLogo compact className="mb-5" imageClassName="h-14" />
          {settings.popupImage ? (
            <div className="mb-5 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              <img
                src={settings.popupImage}
                alt={settings.popupTitle || "Promo ISIKUY"}
                loading="eager"
                decoding="async"
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a82]">
            ISIKUY ALERT
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            {settings.popupTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            {settings.popupMessage}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {settings.popupButtonUrl && isExternalButton ? (
              <a
                href={settings.popupButtonUrl}
                onClick={dismiss}
                className={buttonClassName}
              >
                <Zap className="h-4 w-4" />
                {settings.popupButtonText || "Lihat Detail"}
              </a>
            ) : settings.popupButtonUrl ? (
              <Link
                to={settings.popupButtonUrl}
                onClick={dismiss}
                className={buttonClassName}
              >
                <Zap className="h-4 w-4" />
                {settings.popupButtonText || "Lihat Detail"}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.07]"
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
