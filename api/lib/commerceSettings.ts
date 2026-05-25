import { siteSettings } from "@db/schema";
import { getDb } from "../queries/connection";
import { env } from "./env";

const COMMERCE_KEYS = {
  markupMode: "commerceMarkupMode",
  productMarkupPercent: "commerceProductMarkupPercent",
  checkoutFeePercent: "commerceCheckoutFeePercent",
  checkoutFeeFixed: "commerceCheckoutFeeFixed",
  qrisExpiryMinutes: "commerceQrisExpiryMinutes",
  flowixMinimumBalanceReserve: "commerceFlowixMinimumBalanceReserve",
  flowixProductCategories: "commerceFlowixProductCategories",
} as const;

export type CommerceSettings = {
  markupMode: "tiered" | "percent";
  productMarkupPercent: number;
  effectiveProductMarkupPercent: number | undefined;
  checkoutFeePercent: number;
  checkoutFeeFixed: number;
  qrisExpiryMinutes: number;
  flowixMinimumBalanceReserve: number;
  flowixProductCategories: string[];
};

export type CommerceSettingsInput = {
  markupMode: "tiered" | "percent";
  productMarkupPercent: number;
  checkoutFeePercent: number;
  checkoutFeeFixed: number;
  qrisExpiryMinutes: number;
  flowixMinimumBalanceReserve: number;
  flowixProductCategories: string[];
};

function numberValue(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function categoriesValue(value: string | undefined) {
  const source = value || env.flowixProductCategories.join(",");
  return source
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(values: Record<string, string | undefined>): CommerceSettings {
  const markupMode = values[COMMERCE_KEYS.markupMode] === "percent" ? "percent" : "tiered";
  const productMarkupPercent = numberValue(
    values[COMMERCE_KEYS.productMarkupPercent],
    env.productMarkupPercent ?? 2,
  );

  return {
    markupMode,
    productMarkupPercent,
    effectiveProductMarkupPercent: markupMode === "percent" ? productMarkupPercent : undefined,
    checkoutFeePercent: numberValue(values[COMMERCE_KEYS.checkoutFeePercent], env.checkoutTaxPercent),
    checkoutFeeFixed: numberValue(values[COMMERCE_KEYS.checkoutFeeFixed], 0),
    qrisExpiryMinutes: numberValue(values[COMMERCE_KEYS.qrisExpiryMinutes], 60),
    flowixMinimumBalanceReserve: numberValue(values[COMMERCE_KEYS.flowixMinimumBalanceReserve], 250),
    flowixProductCategories: categoriesValue(values[COMMERCE_KEYS.flowixProductCategories]),
  };
}

export async function getCommerceSettings() {
  const db = getDb();
  const allRows = await db.select().from(siteSettings);
  const values = Object.fromEntries(
    allRows.map((setting) => [setting.key, setting.value ?? ""]),
  );

  return normalize(values);
}

export async function setCommerceSettings(input: CommerceSettingsInput) {
  const db = getDb();
  const normalized = normalize({
    [COMMERCE_KEYS.markupMode]: input.markupMode,
    [COMMERCE_KEYS.productMarkupPercent]: String(input.productMarkupPercent),
    [COMMERCE_KEYS.checkoutFeePercent]: String(input.checkoutFeePercent),
    [COMMERCE_KEYS.checkoutFeeFixed]: String(input.checkoutFeeFixed),
    [COMMERCE_KEYS.qrisExpiryMinutes]: String(input.qrisExpiryMinutes),
    [COMMERCE_KEYS.flowixMinimumBalanceReserve]: String(input.flowixMinimumBalanceReserve),
    [COMMERCE_KEYS.flowixProductCategories]: input.flowixProductCategories.join(","),
  });
  const entries = [
    { key: COMMERCE_KEYS.markupMode, value: normalized.markupMode, type: "string" as const },
    { key: COMMERCE_KEYS.productMarkupPercent, value: String(normalized.productMarkupPercent), type: "number" as const },
    { key: COMMERCE_KEYS.checkoutFeePercent, value: String(normalized.checkoutFeePercent), type: "number" as const },
    { key: COMMERCE_KEYS.checkoutFeeFixed, value: String(normalized.checkoutFeeFixed), type: "number" as const },
    { key: COMMERCE_KEYS.qrisExpiryMinutes, value: String(normalized.qrisExpiryMinutes), type: "number" as const },
    { key: COMMERCE_KEYS.flowixMinimumBalanceReserve, value: String(normalized.flowixMinimumBalanceReserve), type: "number" as const },
    { key: COMMERCE_KEYS.flowixProductCategories, value: normalized.flowixProductCategories.join(","), type: "string" as const },
  ];

  for (const entry of entries) {
    await db
      .insert(siteSettings)
      .values(entry)
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value: entry.value,
          type: entry.type,
          updatedAt: new Date(),
        },
      });
  }

  return normalized;
}
