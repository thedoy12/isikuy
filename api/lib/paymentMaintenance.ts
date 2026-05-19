import { eq } from "drizzle-orm";
import { siteSettings } from "@db/schema";
import { getDb } from "../queries/connection";

const PAYMENT_MAINTENANCE_ENABLED_KEY = "paymentMaintenanceEnabled";
const PAYMENT_MAINTENANCE_MESSAGE_KEY = "paymentMaintenanceMessage";
const DEFAULT_PAYMENT_MAINTENANCE_MESSAGE =
  "Pembayaran sedang ditutup sementara karena provider sedang maintenance. Silakan coba lagi nanti.";

async function getSetting(key: string) {
  const [row] = await getDb()
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string, type: "string" | "boolean" = "string") {
  await getDb()
    .insert(siteSettings)
    .values({ key, value, type })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, type, updatedAt: new Date() },
    });
}

export async function getPaymentMaintenance() {
  const enabled = (await getSetting(PAYMENT_MAINTENANCE_ENABLED_KEY)) === "true";
  const message = (await getSetting(PAYMENT_MAINTENANCE_MESSAGE_KEY)) || DEFAULT_PAYMENT_MAINTENANCE_MESSAGE;
  return { enabled, message };
}

export async function setPaymentMaintenance(input: { enabled: boolean; message?: string }) {
  await setSetting(PAYMENT_MAINTENANCE_ENABLED_KEY, String(input.enabled), "boolean");
  await setSetting(
    PAYMENT_MAINTENANCE_MESSAGE_KEY,
    input.message?.trim() || DEFAULT_PAYMENT_MAINTENANCE_MESSAGE,
  );
  return { success: true };
}
