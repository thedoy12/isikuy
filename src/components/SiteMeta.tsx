import { useEffect } from "react";
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

export default function SiteMeta() {
  const { data: settings } = trpc.site.publicSettings.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settings) return;

    document.title = settings.metaTitle;
    setMeta('meta[name="description"]', "content", settings.metaDescription);
    setMeta('meta[name="keywords"]', "content", settings.metaKeywords);
    setMeta(
      'meta[name="robots"]',
      "content",
      `${settings.robotsIndex ? "index" : "noindex"}, ${settings.robotsFollow ? "follow" : "nofollow"}`,
    );
    setMeta('meta[property="og:title"]', "content", settings.metaTitle);
    setMeta('meta[property="og:description"]', "content", settings.metaDescription);
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[property="og:site_name"]', "content", settings.siteName);
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    if (settings.ogImage) {
      setMeta('meta[property="og:image"]', "content", settings.ogImage);
      setMeta('meta[name="twitter:image"]', "content", settings.ogImage);
    }
    if (settings.canonicalUrl) {
      setMeta('link[rel="canonical"]', "href", settings.canonicalUrl);
    }
  }, [settings]);

  return null;
}

