import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Sparkles, Wand2, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import BrandLogo from "@/components/BrandLogo";

const DISMISS_KEY = "isikuy_tools_popup_dismissed_until";
const MAIN_POPUP_DISMISS_KEY = "isikuy_popup_dismissed_until";
const MAIN_POPUP_ACTIVE_KEY = "isikuy_popup_active";
const MAIN_POPUP_CLOSED_EVENT = "isikuy:main-popup-closed";

export default function ToolsPromoPopup() {
  const location = useLocation();
  const { data: settings } = trpc.site.publicSettings.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!settings?.toolsPopupEnabled || location.pathname.startsWith("/admin") || location.pathname.startsWith("/tools")) {
      setVisible(false);
      return;
    }

    const showIfAllowed = () => {
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || "0");
      const mainDismissedUntil = Number(localStorage.getItem(MAIN_POPUP_DISMISS_KEY) || "0");
      const mainPopupActive = localStorage.getItem(MAIN_POPUP_ACTIVE_KEY) === "true";
      const mainPopupCanAppear = !!settings.popupEnabled && Date.now() > mainDismissedUntil;

      if (mainPopupActive || mainPopupCanAppear) {
        setVisible(false);
        return;
      }

      setVisible(Date.now() > dismissedUntil);
    };

    const timer = window.setTimeout(showIfAllowed, 900);
    window.addEventListener(MAIN_POPUP_CLOSED_EVENT, showIfAllowed);
    window.addEventListener("storage", showIfAllowed);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(MAIN_POPUP_CLOSED_EVENT, showIfAllowed);
      window.removeEventListener("storage", showIfAllowed);
    };
  }, [settings, location.pathname]);

  if (!settings?.toolsPopupEnabled || location.pathname.startsWith("/admin") || location.pathname.startsWith("/tools") || !visible) {
    return null;
  }

  const dismiss = () => {
    const hours = Math.max(1, settings.toolsPopupDismissHours || 12);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + hours * 60 * 60 * 1000));
    setVisible(false);
  };
  const isExternalButton = /^https?:\/\//i.test(settings.toolsPopupButtonUrl);
  const buttonClassName =
    "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg bg-[#ff003c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#b30029]";

  return (
    <div className="fixed inset-0 z-[78] overflow-x-hidden bg-black/70 backdrop-blur-sm">
      <div className="absolute left-4 right-4 top-1/2 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-xl border border-[#00f0ff]/25 bg-[#05090d] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_70px_rgba(0,240,255,0.14)] sm:p-6">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,240,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,77,0.28) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 bg-black/30 p-2 text-white/60 transition-colors hover:text-white"
          aria-label="Tutup tools popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative min-w-0">
          <BrandLogo compact className="mb-5" imageClassName="h-14" />
          {settings.toolsPopupImage ? (
            <div className="mb-5 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              <img
                src={settings.toolsPopupImage}
                alt={settings.toolsPopupTitle || "Tools ISIKUY"}
                loading="eager"
                decoding="async"
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#00f0ff]">
            <Sparkles className="h-4 w-4" />
            ISIKUY TOOLS
          </p>
          <h2 className="break-words font-display text-3xl font-bold leading-tight text-white">
            {settings.toolsPopupTitle}
          </h2>
          <p className="mt-3 break-words text-sm leading-relaxed text-white/60">
            {settings.toolsPopupMessage}
          </p>
          <div className="mt-6 grid gap-3 sm:flex sm:flex-row">
            {settings.toolsPopupButtonUrl && isExternalButton ? (
              <a href={settings.toolsPopupButtonUrl} onClick={dismiss} className={buttonClassName}>
                <Wand2 className="h-4 w-4" />
                <span className="truncate">{settings.toolsPopupButtonText || "Buka Tools"}</span>
              </a>
            ) : settings.toolsPopupButtonUrl ? (
              <Link to={settings.toolsPopupButtonUrl} onClick={dismiss} className={buttonClassName}>
                <Wand2 className="h-4 w-4" />
                <span className="truncate">{settings.toolsPopupButtonText || "Buka Tools"}</span>
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
