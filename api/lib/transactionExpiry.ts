import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { transactions } from "@db/schema";
import { getDb } from "../queries/connection";

export const QRIS_PAYMENT_TIMEOUT_MS = 60 * 60 * 1000;

export function qrisExpiryDate(from = new Date(), timeoutMs = QRIS_PAYMENT_TIMEOUT_MS) {
  return new Date(from.getTime() + timeoutMs);
}

export function isUnpaidExpirableStatus(status: string, paymentStatus: string) {
  return paymentStatus === "unpaid" && ["pending", "processing"].includes(status);
}

export async function failExpiredUnpaidTransactions(now = new Date()) {
  const db = getDb();
  const result = await db
    .update(transactions)
    .set({
      status: "failed",
      paymentStatus: "expired",
      providerResponse: sql<string>`case
        when ${transactions.providerResponse} is null then '{"autoFailedReason":"Pembayaran tidak ditemukan dalam 1 jam sejak QRIS dibuat."}'
        else ${transactions.providerResponse}::jsonb || '{"autoFailedReason":"Pembayaran tidak ditemukan dalam 1 jam sejak QRIS dibuat."}'::jsonb
      end::text`,
    })
    .where(
      and(
        inArray(transactions.status, ["pending", "processing"]),
        eq(transactions.paymentStatus, "unpaid"),
        lte(transactions.expiryAt, now),
      ),
    )
    .returning({ id: transactions.id });

  return result.length;
}
