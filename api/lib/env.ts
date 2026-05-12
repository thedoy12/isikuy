import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
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
};
