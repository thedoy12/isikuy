import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function listEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "dev12345",
  flowixBaseUrl: process.env.FLOWIX_BASE_URL || "https://flowix.web.id/api/v1",
  flowixApiKey: process.env.FLOWIX_API_KEY ?? "",
  flowixMerchantId: process.env.FLOWIX_MERCHANT_ID ?? "",
  flowixWebhookSecret: process.env.FLOWIX_WEBHOOK_SECRET ?? "",
  flowixProductCategories: listEnv("FLOWIX_PRODUCT_CATEGORIES", [
    "game",
    "pulsa",
    "data",
    "ewallet",
    "voucher",
    "pln",
  ]),
  flowixGameWhitelist: listEnv("FLOWIX_GAME_WHITELIST", [
    "mobile legends",
    "mobile legend",
    "free fire",
    "pubg mobile",
    "pubg",
    "honor of kings",
    "genshin impact",
    "honkai star rail",
    "zenless zone zero",
    "valorant",
    "roblox",
    "call of duty mobile",
    "cod mobile",
    "point blank",
    "arena of valor",
    "aov",
    "league of legends wild rift",
    "wild rift",
    "blood strike",
    "ragnarok",
    "undawn",
    "sausage man",
    "minecraft",
    "steam",
    "playstation",
    "google play",
  ]),
  productMarkupPercent: numberEnv("PRODUCT_MARKUP_PERCENT", 3),
  checkoutTaxPercent: numberEnv("CHECKOUT_TAX_PERCENT", 0.5),
};
