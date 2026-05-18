import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { siteSettings } from "@db/schema";

const DEFAULT_META_KEYWORDS =
  "top up ml murah instant, diamond ml murah legal, top up ff via dana, top up valorant points murah, top up pubg qris, top up hok murah terpercaya, top up game pakai dana, top up qris, top up pakai gopay, top up tanpa login, top up hok, top up zzz, top up wuthering waves, top up hsr murah";
const LEGACY_META_KEYWORDS =
  "top up game, topup mobile legends, top up free fire, top up pubg mobile, voucher game, qris";

const DEFAULT_SITE_SETTINGS = {
  siteName: "ISIKUY TOPUP",
  siteTagline: "Top Up Game, Pulsa, dan Voucher Digital",
  metaTitle: "ISIKUY TOPUP - Top Up Game, Pulsa, dan Voucher Digital",
  metaDescription:
    "ISIKUY TOPUP melayani top up game, pulsa, e-wallet, dan voucher digital dengan proses cepat, pembayaran praktis, serta bantuan melalui WhatsApp 0895393061538 dan email putradadoy@gmail.com.",
  metaKeywords:
    DEFAULT_META_KEYWORDS,
  canonicalUrl: "",
  ogImage: "",
  contactEmail: "putradadoy@gmail.com",
  contactPhone: "0895393061538",
  whatsappNumber: "62895393061538",
  instagramUrl: "",
  robotsIndex: "true",
  robotsFollow: "true",
  popupEnabled: "false",
  popupTitle: "Promo ISIKUY",
  popupMessage: "Top up game favorit kamu lebih cepat dengan pembayaran praktis.",
  popupImage: "",
  popupButtonText: "Lihat Game",
  popupButtonUrl: "/games",
  popupDismissHours: "24",
};

export type PublicSiteSettings = ReturnType<typeof normalizeSiteSettings>;

function toBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true";
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits || DEFAULT_SITE_SETTINGS.whatsappNumber;
}

function normalizeSiteSettings(values: Record<string, string>) {
  const merged = { ...DEFAULT_SITE_SETTINGS, ...values };
  if (merged.contactEmail === "support@isikuy.id") {
    merged.contactEmail = DEFAULT_SITE_SETTINGS.contactEmail;
  }
  if (merged.contactPhone === "+62 812-3456-7890") {
    merged.contactPhone = DEFAULT_SITE_SETTINGS.contactPhone;
  }
  if (merged.whatsappNumber === "+6281234567890") {
    merged.whatsappNumber = DEFAULT_SITE_SETTINGS.whatsappNumber;
  }
  if (merged.metaKeywords === LEGACY_META_KEYWORDS) {
    merged.metaKeywords = DEFAULT_META_KEYWORDS;
  }
  const whatsappNumber = normalizeWhatsapp(merged.whatsappNumber || merged.contactPhone);

  return {
    siteName: merged.siteName,
    siteTagline: merged.siteTagline,
    metaTitle: merged.metaTitle,
    metaDescription: merged.metaDescription,
    metaKeywords: merged.metaKeywords,
    canonicalUrl: merged.canonicalUrl,
    ogImage: merged.ogImage,
    contactEmail: merged.contactEmail,
    contactPhone: merged.contactPhone,
    whatsappNumber,
    instagramUrl: merged.instagramUrl,
    robotsIndex: toBoolean(merged.robotsIndex, true),
    robotsFollow: toBoolean(merged.robotsFollow, true),
    popupEnabled: toBoolean(merged.popupEnabled),
    popupTitle: merged.popupTitle,
    popupMessage: merged.popupMessage,
    popupImage: merged.popupImage,
    popupButtonText: merged.popupButtonText,
    popupButtonUrl: merged.popupButtonUrl,
    popupDismissHours: toNumber(merged.popupDismissHours, 24),
  };
}

export async function getPublicSiteSettings() {
  const db = getDb();
  const rows = await db.select().from(siteSettings);
  const values = Object.fromEntries(
    rows.map((setting) => [setting.key, setting.value ?? ""]),
  );

  return normalizeSiteSettings(values);
}

export async function ensureDefaultSiteSettings() {
  const db = getDb();
  const existingRows = await db
    .select({ key: siteSettings.key })
    .from(siteSettings)
    .where(eq(siteSettings.key, "siteName"));

  if (existingRows.length > 0) return;

  await db.insert(siteSettings).values(
    Object.entries(DEFAULT_SITE_SETTINGS).map(([key, value]) => ({
      key,
      value,
      type:
        key === "popupDismissHours"
          ? ("number" as const)
          : key === "popupEnabled" || key.startsWith("robots")
            ? ("boolean" as const)
            : ("string" as const),
    })),
  );
}

export const siteRouter = createRouter({
  publicSettings: publicQuery.query(async () => getPublicSiteSettings()),
});
