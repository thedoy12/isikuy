import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, desc, gte, lte, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { transactions, games, products, paymentMethods, vouchers } from "@db/schema";
import { createFlowixDeposit, isFlowixConfigured } from "../flowix/client";
import { env } from "../lib/env";

function generateInvoice(): string {
  const date = new Date();
  const prefix = "ISK";
  const timestamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

async function validateVoucher(input: { code?: string; amount: number }) {
  const code = input.code?.trim().toUpperCase();
  if (!code) return null;

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

  if (!voucher) throw new Error("Voucher tidak valid atau sudah expired");
  if (voucher.usageCount >= voucher.usageLimit) {
    throw new Error("Voucher sudah mencapai batas penggunaan");
  }

  const minOrder = parseFloat(voucher.minOrder);
  if (input.amount < minOrder) {
    throw new Error(`Minimal pembelian Rp${minOrder.toLocaleString()}`);
  }

  const rawDiscount =
    voucher.type === "percent"
      ? input.amount * (parseFloat(voucher.value) / 100)
      : parseFloat(voucher.value);
  const cappedDiscount = voucher.maxDiscount
    ? Math.min(rawDiscount, parseFloat(voucher.maxDiscount))
    : rawDiscount;

  return {
    id: voucher.id,
    discountAmount: Math.min(Math.round(cappedDiscount), input.amount),
  };
}

function getVoucherState(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      voucher?: { id: number; discountAmount: number; usageCounted?: boolean };
    };
    return parsed.voucher ?? null;
  } catch {
    return null;
  }
}

async function countVoucherUsageOnce(raw: string | null) {
  const voucher = getVoucherState(raw);
  if (!voucher || voucher.usageCounted) return raw;

  const db = getDb();
  await db
    .update(vouchers)
    .set({ usageCount: sql`${vouchers.usageCount} + 1` })
    .where(eq(vouchers.id, voucher.id));

  try {
    return JSON.stringify({
      ...JSON.parse(raw || "{}"),
      voucher: { ...voucher, usageCounted: true },
    });
  } catch {
    return raw;
  }
}

export const transactionRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        gameId: z.number(),
        productId: z.number(),
        playerId: z.string().trim().min(1),
        serverId: z.string().trim().optional(),
        paymentMethodId: z.number(),
        voucherCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const invoiceNumber = generateInvoice();
      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 24);

      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.isActive, true)))
        .limit(1);
      if (!product || product.gameId !== input.gameId) {
        throw new Error("Produk tidak ditemukan");
      }

      const [game] = await db
        .select()
        .from(games)
        .where(and(eq(games.id, product.gameId), eq(games.isActive, true)))
        .limit(1);
      if (!game) throw new Error("Game tidak ditemukan");
      if (game.hasServerId && !input.serverId?.trim()) {
        throw new Error(`${game.serverIdLabel || "Server ID"} wajib diisi`);
      }

      const [method] = await db
        .select()
        .from(paymentMethods)
        .where(
          and(
            eq(paymentMethods.id, input.paymentMethodId),
            eq(paymentMethods.code, "qris"),
            eq(paymentMethods.isActive, true),
          ),
        )
        .limit(1);
      if (!method) throw new Error("Metode pembayaran belum tersedia");
      if (env.isProduction && method.code === "qris" && !isFlowixConfigured()) {
        throw new Error("Pembayaran QRIS belum dikonfigurasi.");
      }

      const baseAmount = parseFloat(product.salePrice || product.basePrice);
      const voucher = await validateVoucher({
        code: input.voucherCode,
        amount: baseAmount,
      });
      const feeAmount = 0;
      const totalAmount = Math.max(1, baseAmount - (voucher?.discountAmount || 0));
      const finalFeeAmount = feeAmount;
      const finalTotalAmount = totalAmount;
      let providerReference: string | null = null;
      let providerPaymentId: string | null = null;
      let providerResponse: string | null = voucher ? JSON.stringify({ voucher }) : null;
      let payment = null;

      if (method.code === "qris" && isFlowixConfigured()) {
        const flowixDeposit = await createFlowixDeposit({
          amount: Math.round(totalAmount),
          methodCode: "QRIS",
          feeByCustomer: false,
        });
        providerReference = flowixDeposit.reff_id;
        providerPaymentId = flowixDeposit.pay_id;
        providerResponse = JSON.stringify({
          ...(voucher ? { voucher } : {}),
          deposit: flowixDeposit,
        });
        payment = {
          provider: "flowix",
          reference: flowixDeposit.reff_id,
          paymentId: flowixDeposit.pay_id,
          amountTotal: Number(flowixDeposit.amount_total || finalTotalAmount),
          amountReceived: flowixDeposit.amount_received,
          amountRequested: Math.round(totalAmount),
          providerAdjustment: Number(flowixDeposit.amount_total || finalTotalAmount) - Math.round(totalAmount),
          payUrl: flowixDeposit.pay_url,
          payCode: flowixDeposit.pay_code,
          qrString: flowixDeposit.qr_string,
          qrImage: flowixDeposit.qr_image,
          instructions: flowixDeposit.instructions ?? [],
          expiredAt: flowixDeposit.expired_at,
        };
      }

      const result = await db.insert(transactions).values({
        userId: ctx.user?.id || null,
        invoiceNumber,
        gameId: game.id,
        productId: product.id,
        providerProductCode: product.nominalAmount || null,
        providerProductName: product.name,
        playerId: input.playerId,
        serverId: input.serverId || null,
        paymentMethodId: input.paymentMethodId,
        baseAmount: baseAmount.toString(),
        feeAmount: finalFeeAmount.toString(),
        totalAmount: finalTotalAmount.toString(),
        status: "pending",
        paymentStatus: "unpaid",
        expiryAt,
        providerReference,
        providerPaymentId,
        providerResponse,
      }).returning({ id: transactions.id });

      return { id: result[0].id, invoiceNumber, payment };
    }),

  getByInvoice: publicQuery
    .input(z.object({ invoiceNumber: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [transaction] = await db
        .select({
          id: transactions.id,
          invoiceNumber: transactions.invoiceNumber,
          playerId: transactions.playerId,
          serverId: transactions.serverId,
          baseAmount: transactions.baseAmount,
          feeAmount: transactions.feeAmount,
          totalAmount: transactions.totalAmount,
          status: transactions.status,
          paymentStatus: transactions.paymentStatus,
          paidAt: transactions.paidAt,
          completedAt: transactions.completedAt,
          expiryAt: transactions.expiryAt,
          createdAt: transactions.createdAt,
          gameId: transactions.gameId,
          productId: transactions.productId,
          paymentMethodId: transactions.paymentMethodId,
          providerProductName: transactions.providerProductName,
        })
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
        })
        .from(transactions)
        .where(eq(transactions.invoiceNumber, input.invoiceNumber))
        .limit(1);

      return transaction || null;
    }),

  cancel: authedQuery
    .input(z.object({ invoiceNumber: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [transaction] = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          status: transactions.status,
          paymentStatus: transactions.paymentStatus,
        })
        .from(transactions)
        .where(eq(transactions.invoiceNumber, input.invoiceNumber))
        .limit(1);

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
      }

      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";
      if (!isAdmin && transaction.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tidak boleh membatalkan transaksi ini" });
      }
      if (transaction.status !== "pending" || transaction.paymentStatus !== "unpaid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Transaksi tidak bisa dibatalkan" });
      }

      await db
        .update(transactions)
        .set({ status: "cancelled", paymentStatus: "expired" })
        .where(eq(transactions.id, transaction.id));

      return { success: true };
    }),

  processPayment: publicQuery
    .input(z.object({ invoiceNumber: z.string() }))
    .mutation(async ({ input }) => {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Pembayaran produksi hanya diproses dari callback Flowix.");
      }

      const db = getDb();
      const [transaction] = await db
        .select({
          id: transactions.id,
          providerResponse: transactions.providerResponse,
        })
        .from(transactions)
        .where(eq(transactions.invoiceNumber, input.invoiceNumber))
        .limit(1);

      const providerResponse = await countVoucherUsageOnce(transaction?.providerResponse ?? null);
      await db
        .update(transactions)
        .set({
          status: "processing",
          paymentStatus: "paid",
          paidAt: new Date(),
          ...(providerResponse ? { providerResponse } : {}),
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
