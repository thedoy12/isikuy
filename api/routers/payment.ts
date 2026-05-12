import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { paymentMethods, products } from "@db/schema";
import { env } from "../lib/env";

export const paymentRouter = createRouter({
  methods: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.sortOrder);
  }),

  calculate: publicQuery
    .input(
      z.object({
        productId: z.number(),
        paymentMethodId: z.number(),
        basePrice: z.number().positive().optional(),
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
        .where(eq(paymentMethods.id, input.paymentMethodId))
        .limit(1);

      if (!method) throw new Error("Payment method not found");

      const basePrice = product
        ? parseFloat(product.salePrice || product.basePrice)
        : input.basePrice!;
      const feePercent = parseFloat(method.feePercent || "0");
      const feeFixed = parseFloat(method.feeFixed || "0");
      const servicePercent = env.checkoutTaxPercent;
      const serviceAmount = Math.round(basePrice * (servicePercent / 100));
      const paymentFeeAmount = Math.round(basePrice * (feePercent / 100) + feeFixed);
      const feeAmount = serviceAmount + paymentFeeAmount;
      const totalAmount = basePrice + feeAmount;

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
        totalAmount,
        product,
        method,
      };
    }),
});
