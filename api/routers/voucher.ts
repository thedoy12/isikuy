import { z } from "zod";
import { eq, and, gte } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { vouchers } from "@db/schema";

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

      const [voucher] = await db
        .select()
        .from(vouchers)
        .where(
          and(
            eq(vouchers.code, input.code),
            eq(vouchers.isActive, true),
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

      let discount = 0;
      if (voucher.type === "percent") {
        discount = input.amount * (parseFloat(voucher.value) / 100);
        if (voucher.maxDiscount) {
          discount = Math.min(discount, parseFloat(voucher.maxDiscount));
        }
      } else {
        discount = parseFloat(voucher.value);
      }

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
