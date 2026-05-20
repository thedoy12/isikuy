import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { vouchers } from "@db/schema";
import { safeDiscountAmount } from "../lib/pricing";

export const voucherRouter = createRouter({
  validate: publicQuery
    .input(
      z.object({
        code: z.string(),
        amount: z.number().positive(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const now = new Date();
      const code = input.code.trim().toUpperCase();

      const [voucher] = await db
        .select()
        .from(vouchers)
        .where(
          and(
            eq(vouchers.code, code),
            eq(vouchers.isActive, true),
            lte(vouchers.validFrom, now),
            gte(vouchers.validUntil, now)
          )
        )
        .limit(1);

      if (!voucher) {
        return { valid: false, message: "Voucher tidak valid atau sudah expired" };
      }

      if (voucher.usageCount >= voucher.usageLimit) {
        return { valid: false, message: "Voucher sudah mencapai batas penggunaan" };
      }

      const minOrder = parseFloat(voucher.minOrder);
      if (input.amount < minOrder) {
        return { valid: false, message: `Minimal pembelian Rp${minOrder.toLocaleString()}` };
      }

      const rawDiscount =
        voucher.type === "percent"
          ? input.amount * (parseFloat(voucher.value) / 100)
          : parseFloat(voucher.value);
      const cappedDiscount = voucher.maxDiscount
        ? Math.min(rawDiscount, parseFloat(voucher.maxDiscount))
        : rawDiscount;
      const discount = safeDiscountAmount({
        amount: input.amount,
        rawDiscount: cappedDiscount,
      });

      return {
        valid: true,
        voucher: {
          id: voucher.id,
          code: voucher.code,
          type: voucher.type,
          value: voucher.value,
          discount,
        },
      };
    }),
});
