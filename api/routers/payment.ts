import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { paymentMethods, products, vouchers } from "@db/schema";

async function calculateVoucherDiscount(input: {
  code?: string;
  amount: number;
}) {
  const code = input.code?.trim().toUpperCase();
  if (!code) return { discountAmount: 0, voucher: null, message: null };

  const db = getDb();
  const now = new Date();
  const [voucher] = await db
    .select()
    .from(vouchers)
    .where(
      and(
        eq(vouchers.code, code),
        eq(vouchers.isActive, true),
        lte(vouchers.validFrom, now),
        gte(vouchers.validUntil, now),
      ),
    )
    .limit(1);

  if (!voucher) {
    return { discountAmount: 0, voucher: null, message: "Voucher tidak valid atau sudah expired" };
  }

  if (voucher.usageCount >= voucher.usageLimit) {
    return { discountAmount: 0, voucher: null, message: "Voucher sudah mencapai batas penggunaan" };
  }

  const minOrder = parseFloat(voucher.minOrder);
  if (input.amount < minOrder) {
    return {
      discountAmount: 0,
      voucher: null,
      message: `Minimal pembelian Rp${minOrder.toLocaleString()}`,
    };
  }

  const rawDiscount =
    voucher.type === "percent"
      ? input.amount * (parseFloat(voucher.value) / 100)
      : parseFloat(voucher.value);
  const cappedDiscount = voucher.maxDiscount
    ? Math.min(rawDiscount, parseFloat(voucher.maxDiscount))
    : rawDiscount;
  const discountAmount = Math.min(Math.round(cappedDiscount), input.amount);

  return {
    discountAmount,
    voucher: {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
    },
    message: "Voucher diterapkan",
  };
}

export const paymentRouter = createRouter({
  methods: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.isActive, true), eq(paymentMethods.code, "qris")))
      .orderBy(paymentMethods.sortOrder);
  }),

  calculate: publicQuery
    .input(
      z.object({
        productId: z.number(),
        paymentMethodId: z.number(),
        basePrice: z.number().positive().optional(),
        voucherCode: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [product] =
        input.productId > 0
          ? await db
              .select()
              .from(products)
              .where(eq(products.id, input.productId))
              .limit(1)
          : [];

      if (input.productId > 0 && !product) throw new Error("Product not found");
      if (input.productId <= 0 && !input.basePrice) {
        throw new Error("Product price is required");
      }

      const [method] = await db
        .select()
        .from(paymentMethods)
        .where(and(eq(paymentMethods.id, input.paymentMethodId), eq(paymentMethods.code, "qris")))
        .limit(1);

      if (!method) throw new Error("Metode pembayaran belum tersedia");

      const basePrice = product
        ? parseFloat(product.salePrice || product.basePrice)
        : input.basePrice!;
      const { discountAmount, voucher, message: voucherMessage } =
        await calculateVoucherDiscount({
          code: input.voucherCode,
          amount: basePrice,
        });
      const feePercent = 0;
      const feeFixed = 0;
      const servicePercent = 0;
      const serviceAmount = 0;
      const paymentFeeAmount = 0;
      const feeAmount = 0;
      const totalAmount = Math.max(1, basePrice - discountAmount);

      return {
        basePrice,
        feePercent,
        feeFixed,
        servicePercent,
        serviceAmount,
        taxPercent: servicePercent,
        taxAmount: serviceAmount,
        paymentFeeAmount,
        feeAmount,
        discountAmount,
        totalAmount,
        voucher,
        voucherMessage,
        product,
        method,
      };
    }),
});
