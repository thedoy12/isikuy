import { eq, desc } from "drizzle-orm";
import { games, tools } from "@db/schema";
import { getPublicSiteSettings } from "../routers/site";
import { getDb } from "../queries/connection";

const STATIC_INDEXABLE_PATHS = [
  "/",
  "/games",
  "/tools",
  "/tentang",
  "/kontak",
  "/bantuan",
  "/privacy",
  "/terms",
  "/refund",
];

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export async function publicSiteOrigin(requestUrl: string) {
  const settings = await getPublicSiteSettings().catch(() => null);
  const configured = settings?.canonicalUrl ? normalizeOrigin(settings.canonicalUrl) : "";
  if (configured) return configured;

  const url = new URL(requestUrl);
  return url.origin;
}

function sitemapUrl(origin: string, path: string, priority: string, changefreq: string) {
  return [
    "  <url>",
    `    <loc>${xmlEscape(`${origin}${path}`)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

export async function buildSitemapXml(requestUrl: string) {
  const origin = await publicSiteOrigin(requestUrl);
  const db = getDb();
  const [gameRows, toolRows] = await Promise.all([
    db
      .select({ slug: games.slug, updatedAt: games.updatedAt })
      .from(games)
      .where(eq(games.isActive, true))
      .orderBy(desc(games.isTrending), desc(games.isPopular), games.name),
    db
      .select({ slug: tools.slug, updatedAt: tools.updatedAt })
      .from(tools)
      .where(eq(tools.isActive, true))
      .orderBy(tools.sortOrder, tools.title)
      .catch(() => []),
  ]);

  const staticUrls = STATIC_INDEXABLE_PATHS.map((path) =>
    sitemapUrl(origin, path, path === "/" ? "1.0" : "0.75", path === "/" ? "daily" : "weekly"),
  );
  const gameUrls = gameRows.map((game) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(`${origin}/games/${game.slug}`)}</loc>`,
      game.updatedAt ? `    <lastmod>${game.updatedAt.toISOString()}</lastmod>` : "",
      "    <changefreq>daily</changefreq>",
      "    <priority>0.90</priority>",
      "  </url>",
    ].filter(Boolean).join("\n"),
  );
  const toolUrls = toolRows.map((tool) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(`${origin}/tools/${tool.slug}`)}</loc>`,
      tool.updatedAt ? `    <lastmod>${tool.updatedAt.toISOString()}</lastmod>` : "",
      "    <changefreq>weekly</changefreq>",
      "    <priority>0.70</priority>",
      "  </url>",
    ].filter(Boolean).join("\n"),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...gameUrls,
    ...toolUrls,
    "</urlset>",
  ].join("\n");
}

export async function buildRobotsTxt(requestUrl: string) {
  const origin = await publicSiteOrigin(requestUrl);
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /account",
    "Disallow: /history",
    "Disallow: /payment/",
    "Disallow: /login",
    "Disallow: /register",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}
