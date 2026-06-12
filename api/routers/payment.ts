import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { paymentMethods, products, vouchers } from "@db/schema";
import { getPaymentMaintenance } from "../lib/paymentMaintenance";
import { safeDiscountAmount } from "../lib/pricing";
import { checkRateLimit, rateLimitKey } from "../lib/rateLimit";
import { checkoutAmounts } from "../lib/checkout";
import { getCommerceSettings } from "../lib/commerceSettings";
import {
  getSupplierRouting,
  isProductAvailableForSupplierRoute,
} from "../lib/supplierRouting";

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
  const discountAmount = safeDiscountAmount({
    amount: input.amount,
    rawDiscount: cappedDiscount,
  });

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
  status: publicQuery.query(async () => getPaymentMaintenance()),

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
    .query(async ({ input, ctx }) => {
      checkRateLimit({
        key: rateLimitKey(ctx.req.headers, "payment:calculate"),
        limit: 120,
        windowMs: 10 * 60 * 1000,
      });
      const db = getDb();
      const [product] =
        input.productId > 0
          ? await db
              .select()
              .from(products)
              .where(and(eq(products.id, input.productId), eq(products.isActive, true)))
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

      if (product) {
        const supplierRoute = await getSupplierRouting();
        if (!isProductAvailableForSupplierRoute(product, supplierRoute.mode)) {
          throw new Error("Produk sedang tidak tersedia. Silakan pilih produk lain.");
        }
      }

      const basePrice = product
        ? parseFloat(product.salePrice || product.basePrice)
        : input.basePrice!;
      const { discountAmount, voucher, message: voucherMessage } =
        await calculateVoucherDiscount({
          code: input.voucherCode,
          amount: basePrice,
        });
      const commerceSettings = await getCommerceSettings();
      const amounts = checkoutAmounts({
        baseAmount: basePrice,
        discountAmount,
        feePercent: commerceSettings.checkoutFeePercent,
        feeFixed: commerceSettings.checkoutFeeFixed,
      });
      const feePercent = commerceSettings.checkoutFeePercent;
      const feeFixed = commerceSettings.checkoutFeeFixed;
      const servicePercent = commerceSettings.checkoutFeePercent;
      const serviceAmount = amounts.feeAmount;
      const paymentFeeAmount = 0;
      const feeAmount = amounts.feeAmount;
      const totalAmount = amounts.totalAmount;

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
        method,
      };
    }),
});
