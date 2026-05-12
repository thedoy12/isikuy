import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { transactions, games, products, paymentMethods } from "@db/schema";
import { createFlowixDeposit, isFlowixConfigured } from "../flowix/client";

function generateInvoice(): string {
  const date = new Date();
  const prefix = "ISK";
  const timestamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const transactionRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        gameId: z.number(),
        productId: z.number().optional(),
        providerProductCode: z.string().optional(),
        providerProductName: z.string().optional(),
        playerId: z.string().min(1),
        serverId: z.string().optional(),
        paymentMethodId: z.number(),
        baseAmount: z.number().positive(),
        feeAmount: z.number().default(0),
        totalAmount: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const invoiceNumber = generateInvoice();
      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 24);

      const result = await db.insert(transactions).values({
        userId: ctx.user?.id || null,
        invoiceNumber,
        gameId: input.gameId,
        productId: input.productId && input.productId > 0 ? input.productId : null,
        providerProductCode: input.providerProductCode || null,
        providerProductName: input.providerProductName || null,
        playerId: input.playerId,
        serverId: input.serverId || null,
        paymentMethodId: input.paymentMethodId,
        baseAmount: input.baseAmount.toString(),
        feeAmount: input.feeAmount.toString(),
        totalAmount: input.totalAmount.toString(),
        status: "pending",
        paymentStatus: "unpaid",
        expiryAt,
      }).returning({ id: transactions.id });

      let payment = null;
      const [method] = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, input.paymentMethodId))
        .limit(1);

      if (method?.code === "qris" && isFlowixConfigured()) {
        const flowixDeposit = await createFlowixDeposit({
          amount: Math.round(input.totalAmount),
          methodCode: "QRIS",
          feeByCustomer: true,
        });

        await db
          .update(transactions)
          .set({
            providerReference: flowixDeposit.reff_id,
            providerPaymentId: flowixDeposit.pay_id,
            providerResponse: JSON.stringify(flowixDeposit),
          })
          .where(eq(transactions.id, result[0].id));

        payment = {
          provider: "flowix",
          reference: flowixDeposit.reff_id,
          paymentId: flowixDeposit.pay_id,
          amountTotal: flowixDeposit.amount_total,
          amountReceived: flowixDeposit.amount_received,
          payUrl: flowixDeposit.pay_url,
          payCode: flowixDeposit.pay_code,
          qrString: flowixDeposit.qr_string,
          qrImage: flowixDeposit.qr_image,
          instructions: flowixDeposit.instructions ?? [],
          expiredAt: flowixDeposit.expired_at,
        };
      }

      return { id: result[0].id, invoiceNumber, payment };
    }),

  getByInvoice: publicQuery
    .input(z.object({ invoiceNumber: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.invoiceNumber, input.invoiceNumber))
        .limit(1);

      if (!transaction) return null;

      const [game] = await db
        .select()
        .from(games)
        .where(eq(games.id, transaction.gameId))
        .limit(1);

      const [product] = transaction.productId
        ? await db
            .select()
            .from(products)
            .where(eq(products.id, transaction.productId))
            .limit(1)
        : [];

      const [method] = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, transaction.paymentMethodId))
        .limit(1);

      return { ...transaction, game, product, method };
    }),

  myHistory: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        playerId: transactions.playerId,
        serverId: transactions.serverId,
        baseAmount: transactions.baseAmount,
        totalAmount: transactions.totalAmount,
        status: transactions.status,
        paymentStatus: transactions.paymentStatus,
        createdAt: transactions.createdAt,
        gameName: games.name,
        gameSlug: games.slug,
        gameCover: games.coverImage,
        productName: products.name,
        providerProductName: transactions.providerProductName,
        nominalAmount: products.nominalAmount,
        methodName: paymentMethods.name,
      })
      .from(transactions)
      .leftJoin(games, eq(transactions.gameId, games.id))
      .leftJoin(products, eq(transactions.productId, products.id))
      .leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
      .where(eq(transactions.userId, ctx.user.id))
      .orderBy(desc(transactions.createdAt))
      .limit(50);
  }),

  checkStatus: publicQuery
    .input(z.object({ invoiceNumber: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [transaction] = await db
        .select({
          id: transactions.id,
          invoiceNumber: transactions.invoiceNumber,
          status: transactions.status,
          paymentStatus: transactions.paymentStatus,
          totalAmount: transactions.totalAmount,
          expiryAt: transactions.expiryAt,
          createdAt: transactions.createdAt,
          paidAt: transactions.paidAt,
          completedAt: transactions.completedAt,
          providerReference: transactions.providerReference,
          providerPaymentId: transactions.providerPaymentId,
          providerResponse: transactions.providerResponse,
        })
        .from(transactions)
        .where(eq(transactions.invoiceNumber, input.invoiceNumber))
        .limit(1);

      return transaction || null;
    }),

  cancel: publicQuery
    .input(z.object({ invoiceNumber: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(transactions)
        .set({ status: "cancelled", paymentStatus: "expired" })
        .where(eq(transactions.invoiceNumber, input.invoiceNumber));

      return { success: true };
    }),

  processPayment: publicQuery
    .input(z.object({ invoiceNumber: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(transactions)
        .set({
          status: "processing",
          paymentStatus: "paid",
          paidAt: new Date(),
        })
        .where(eq(transactions.invoiceNumber, input.invoiceNumber));

      setTimeout(async () => {
        await db
          .update(transactions)
          .set({
            status: "success",
            completedAt: new Date(),
          })
          .where(eq(transactions.invoiceNumber, input.invoiceNumber));
      }, 3000);

      return { success: true };
    }),
});
