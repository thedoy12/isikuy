import { useEffect } from "react";
import { useLocation } from "react-router";
import { trpc } from "@/providers/trpc";

function setMeta(selector: string, attribute: "content" | "href", value: string) {
  if (!value) return;

  const isLink = selector.startsWith("link");
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement(isLink ? "link" : "meta");
    const nameMatch = selector.match(/\[(name|property|rel)="([^"]+)"\]/);
    if (nameMatch) element.setAttribute(nameMatch[1], nameMatch[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

function setJsonLd(id: string, value: Record<string, unknown>) {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.id = id;
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(value);
}

function absoluteUrl(origin: string, pathOrUrl: string) {
  if (!pathOrUrl) return "";
  try {
    return new URL(pathOrUrl, origin).toString();
  } catch {
    return pathOrUrl;
  }
}

function canonicalFor(settingsCanonical: string | undefined, pathname: string) {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const origin = settingsCanonical
    ? (() => {
        try {
          return new URL(settingsCanonical).origin;
        } catch {
          return settingsCanonical.replace(/\/+$/, "");
        }
      })()
    : window.location.origin;
  return `${origin}${path}`;
}

function robotsForPath(pathname: string, defaultValue: string) {
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/payment/") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return "noindex, nofollow";
  }
  return defaultValue;
}

function pageHasOwnMeta(pathname: string) {
  return pathname === "/games" || pathname.startsWith("/games/") || pathname.startsWith("/tools/");
}

export default function SiteMeta() {
  const location = useLocation();
  const { data: settings } = trpc.site.publicSettings.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settings) return;

    const canonicalUrl = canonicalFor(settings.canonicalUrl, location.pathname);
    const robots = robotsForPath(
      location.pathname,
      `${settings.robotsIndex ? "index" : "noindex"}, ${settings.robotsFollow ? "follow" : "nofollow"}`,
    );
    const ogImage = settings.ogImage
      ? absoluteUrl(new URL(canonicalUrl).origin, settings.ogImage)
      : absoluteUrl(new URL(canonicalUrl).origin, "/aset-optimized/logo-isi-kuy.webp");

    if (!pageHasOwnMeta(location.pathname)) {
      document.title = settings.metaTitle;
      setMeta('meta[name="description"]', "content", settings.metaDescription);
      setMeta('meta[property="og:title"]', "content", settings.metaTitle);
      setMeta('meta[property="og:description"]', "content", settings.metaDescription);
      setMeta('meta[name="twitter:title"]', "content", settings.metaTitle);
      setMeta('meta[name="twitter:description"]', "content", settings.metaDescription);
      setMeta('meta[property="og:image"]', "content", ogImage);
      setMeta('meta[name="twitter:image"]', "content", ogImage);
    }
    setMeta('meta[name="keywords"]', "content", settings.metaKeywords);
    setMeta('meta[name="robots"]', "content", robots);
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[property="og:site_name"]', "content", settings.siteName);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[property="og:locale"]', "content", "id_ID");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('link[rel="canonical"]', "href", canonicalUrl);

    if (robots.startsWith("noindex")) {
      removeJsonLd("site-structured-data");
      return;
    }

    const origin = new URL(canonicalUrl).origin;
    setJsonLd("site-structured-data", {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: settings.siteName,
          url: origin,
          logo: absoluteUrl(origin, "/aset-optimized/logo-isi-kuy.webp"),
          email: settings.contactEmail,
          telephone: settings.contactPhone,
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "customer support",
              telephone: settings.contactPhone,
              email: settings.contactEmail,
              areaServed: "ID",
              availableLanguage: ["id"],
            },
          ],
        },
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          url: origin,
          name: settings.siteName,
          description: settings.metaDescription,
          publisher: { "@id": `${origin}/#organization` },
          inLanguage: "id-ID",
        },
      ],
    });
  }, [settings, location.pathname]);

  return null;
}
