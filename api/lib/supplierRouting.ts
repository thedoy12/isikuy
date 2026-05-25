import { eq } from "drizzle-orm";
import { siteSettings, type Product } from "@db/schema";
import { getDb } from "../queries/connection";

export const SUPPLIER_ROUTE_MODES = [
  "manual",
  "flowix",
  "digiflazz",
  "digiflazz_fallback_flowix",
] as const;

export type SupplierRouteMode = (typeof SUPPLIER_ROUTE_MODES)[number];

const SUPPLIER_ROUTE_MODE_KEY = "supplierRouteMode";
const SUPPLIER_FLOWIX_MAINTENANCE_KEY = "supplierFlowixMaintenance";
const SUPPLIER_DIGIFLAZZ_MAINTENANCE_KEY = "supplierDigiflazzMaintenance";
const DEFAULT_SUPPLIER_ROUTE_MODE: SupplierRouteMode = "manual";

function isSupplierRouteMode(value: string | null | undefined): value is SupplierRouteMode {
  return SUPPLIER_ROUTE_MODES.includes(value as SupplierRouteMode);
}

async function getSetting(key: string) {
  const [row] = await getDb()
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await getDb()
    .insert(siteSettings)
    .values({ key, value, type: "string" })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, type: "string", updatedAt: new Date() },
    });
}

async function setBooleanSetting(key: string, value: boolean) {
  await getDb()
    .insert(siteSettings)
    .values({ key, value: String(value), type: "boolean" })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: String(value), type: "boolean", updatedAt: new Date() },
    });
}

export async function getSupplierRouting() {
  const stored = await getSetting(SUPPLIER_ROUTE_MODE_KEY);
  return {
    mode: isSupplierRouteMode(stored) ? stored : DEFAULT_SUPPLIER_ROUTE_MODE,
  };
}

export async function setSupplierRouting(input: { mode: SupplierRouteMode }) {
  await setSetting(SUPPLIER_ROUTE_MODE_KEY, input.mode);
  return { success: true, mode: input.mode };
}

export async function getSupplierMaintenance() {
  return {
    flowix: (await getSetting(SUPPLIER_FLOWIX_MAINTENANCE_KEY)) === "true",
    digiflazz: (await getSetting(SUPPLIER_DIGIFLAZZ_MAINTENANCE_KEY)) === "true",
  };
}

export async function setSupplierMaintenance(input: {
  flowix?: boolean;
  digiflazz?: boolean;
}) {
  if (input.flowix !== undefined) {
    await setBooleanSetting(SUPPLIER_FLOWIX_MAINTENANCE_KEY, input.flowix);
  }
  if (input.digiflazz !== undefined) {
    await setBooleanSetting(SUPPLIER_DIGIFLAZZ_MAINTENANCE_KEY, input.digiflazz);
  }
  return getSupplierMaintenance();
}

export function resolveProductSupplier(input: {
  product: Pick<
    Product,
    | "name"
    | "nominalAmount"
    | "supplierProvider"
    | "supplierProductCode"
    | "supplierProductName"
    | "supplierTargetFormat"
  >;
  mode: SupplierRouteMode;
}) {
  const product = input.product;
  const hasDigiflazzCode =
    product.supplierProvider === "digiflazz" && !!product.supplierProductCode;

  if (input.mode === "flowix") {
    return {
      supplierProvider: "flowix",
      supplierProductCode: product.nominalAmount || null,
      supplierProductName: product.name,
      supplierTargetFormat: "auto",
    };
  }

  if (input.mode === "digiflazz" || input.mode === "digiflazz_fallback_flowix") {
    if (hasDigiflazzCode) {
      return {
        supplierProvider: "digiflazz",
        supplierProductCode: product.supplierProductCode,
        supplierProductName: product.supplierProductName || product.name,
        supplierTargetFormat: product.supplierTargetFormat || "auto",
      };
    }

    if (input.mode === "digiflazz_fallback_flowix") {
      return {
        supplierProvider: "flowix",
        supplierProductCode: product.nominalAmount || null,
        supplierProductName: product.name,
        supplierTargetFormat: "auto",
      };
    }

    throw new Error("Produk ini belum punya mapping Digiflazz. Gunakan tombol Auto Map Digiflazz atau pilih mode fallback.");
  }

  return {
    supplierProvider: product.supplierProvider || "flowix",
    supplierProductCode: product.supplierProductCode || product.nominalAmount || null,
    supplierProductName: product.supplierProductName || product.name,
    supplierTargetFormat: product.supplierTargetFormat || "auto",
  };
}
