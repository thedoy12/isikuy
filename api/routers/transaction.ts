import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, desc, gte, lte, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { transactions, games, products, paymentMethods, vouchers } from "@db/schema";
import {
  checkFlowixDeposit,
  checkFlowixTransaction,
  createFlowixDeposit,
  createFlowixTransaction,
  isFlowixConfigured,
  type FlowixTransaction,
} from "../flowix/client";
import { env } from "../lib/env";
import { failExpiredUnpaidTransactions, qrisExpiryDate } from "../lib/transactionExpiry";

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

function parseProviderState(raw: string | null) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function stringifyProviderState(raw: string | null, patch: Record<string, unknown>) {
  return JSON.stringify({
    ...parseProviderState(raw),
    ...patch,
  });
}

function productTransactionStatus(status: string) {
  const normalized = status.toLowerCase();
  if (["paid", "success", "settlement", "settled", "completed", "capture"].includes(normalized)) {
    return "success" as const;
  }
  if (["failed", "failure", "deny", "denied"].includes(normalized)) {
    return "failed" as const;
  }
  if (["expired", "expire", "cancelled", "canceled"].includes(normalized)) {
    return "cancelled" as const;
  }
  if (["refund", "refunded"].includes(normalized)) {
    return "refunded" as const;
  }
  return "processing" as const;
}

async function submitFlowixProductOrder(transaction: {
  providerProductCode: string | null;
  playerId: string;
  serverId: string | null;
  providerReference: string | null;
  providerResponse: string | null;
}) {
  const state = parseProviderState(transaction.providerResponse) as {
    productOrder?: FlowixTransaction;
  };
  const existingOrderRef = state.productOrder?.reff_id;
  if (existingOrderRef) {
    return checkFlowixTransaction(existingOrderRef).catch(() => state.productOrder);
  }

  if (!transaction.providerProductCode) {
    throw new Error("Kode produk Flowix kosong, order tidak bisa dikirim.");
  }

  return createFlowixTransaction({
    serviceCode: transaction.providerProductCode,
    target: transaction.playerId,
    zone: transaction.serverId,
  });
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

async function syncFlowixDepositPayment(invoiceNumber: string) {
  if (!isFlowixConfigured()) return;

  const db = getDb();
  const [transaction] = await db
    .select({
      id: transactions.id,
      invoiceNumber: transactions.invoiceNumber,
      playerId: transactions.playerId,
      serverId: transactions.serverId,
      status: transactions.status,
      paymentStatus: transactions.paymentStatus,
      providerProductCode: transactions.providerProductCode,
      providerReference: transactions.providerReference,
      providerResponse: transactions.providerResponse,
    })
    .from(transactions)
    .where(eq(transactions.invoiceNumber, invoiceNumber))
    .limit(1);

  if (
    !transaction?.providerReference ||
    transaction.paymentStatus === "paid" ||
    transaction.paymentStatus === "expired" ||
    transaction.paymentStatus === "refunded" ||
    !transaction.providerReference.startsWith("DEP-")
  ) {
    return;
  }

  const deposit = await checkFlowixDeposit(transaction.providerReference);
  const depositStatus = deposit.status.toLowerCase();
  if (!["paid", "success", "settlement", "settled", "completed", "capture"].includes(depositStatus)) {
    return;
  }

  let providerResponse = stringifyProviderState(transaction.providerResponse, {
    depositStatus: deposit,
    depositSyncedAt: new Date().toISOString(),
    paymentHoldReason: undefined,
  });
  providerResponse = await countVoucherUsageOnce(providerResponse) ?? providerResponse;

  let nextStatus: "processing" | "success" | "failed" | "cancelled" | "refunded" = "processing";
  let completedAt: Date | undefined;
  try {
    const productOrder = await submitFlowixProductOrder({
      providerProductCode: transaction.providerProductCode,
      playerId: transaction.playerId,
      serverId: transaction.serverId,
      providerReference: transaction.providerReference,
      providerResponse,
    });
    nextStatus = productTransactionStatus(productOrder?.status || "processing");
    completedAt = nextStatus === "success" ? new Date() : undefined;
    providerResponse = stringifyProviderState(providerResponse, {
      productOrder,
      orderSubmitError: undefined,
    });
  } catch (error) {
    nextStatus = "failed";
    providerResponse = stringifyProviderState(providerResponse, {
      orderSubmitError: error instanceof Error ? error.message : "Gagal mengirim order produk Flowix.",
    });
  }

  await db
    .update(transactions)
    .set({
      status: nextStatus,
      paymentStatus: "paid",
      paidAt: new Date(),
      providerResponse,
      ...(completedAt ? { completedAt } : {}),
    })
    .where(eq(transactions.id, transaction.id));
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
      let finalTotalAmount = totalAmount;
      let providerReference: string | null = null;
      let providerPaymentId: string | null = null;
      let providerResponse: string | null = voucher ? JSON.stringify({ voucher }) : null;
      let payment = null;
      const expiryAt = qrisExpiryDate();

      if (method.code === "qris" && isFlowixConfigured()) {
        const flowixDeposit = await createFlowixDeposit({
          amount: Math.round(totalAmount),
          methodCode: "QRIS",
          feeByCustomer: false,
        });
        finalTotalAmount = Number(flowixDeposit.amount_total || totalAmount);
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
          amountTotal: finalTotalAmount,
          amountReceived: flowixDeposit.amount_received,
          amountRequested: Math.round(totalAmount),
          providerAdjustment: finalTotalAmount - Math.round(totalAmount),
          payUrl: flowixDeposit.pay_url,
          payCode: flowixDeposit.pay_code,
          qrString: flowixDeposit.qr_string,
          qrImage: flowixDeposit.qr_image,
          instructions: flowixDeposit.instructions ?? [],
          expiredAt: expiryAt.toISOString(),
          providerExpiredAt: flowixDeposit.expired_at,
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
      await syncFlowixDepositPayment(input.invoiceNumber).catch((error) => {
        console.error("[flowix] Failed to sync deposit payment", error);
      });
      await failExpiredUnpaidTransactions();
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
    await failExpiredUnpaidTransactions();
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
      await syncFlowixDepositPayment(input.invoiceNumber).catch((error) => {
        console.error("[flowix] Failed to sync deposit payment", error);
      });
      await failExpiredUnpaidTransactions();
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

      const isAdmin = ctx.user.role === "admin";
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
