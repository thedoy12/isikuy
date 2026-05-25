import type { Context } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { env } from "../lib/env";
import { getDb } from "../queries/connection";
import { activityLogs, products, transactions, vouchers } from "@db/schema";
import {
  checkFlowixTransaction,
  isFlowixProductUnavailableError,
  type FlowixTransaction,
} from "./client";
import { withTransactionLock } from "../lib/transactionLock";
import { checkSupplierOrder, submitSupplierOrder, type SupplierOrder } from "../suppliers/orders";

type TransactionStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "cancelled"
  | "refunded";

type PaymentStatus = "unpaid" | "paid" | "expired" | "refunded";

type FlowixStatusUpdate = {
  status: TransactionStatus;
  paymentStatus: PaymentStatus;
  paid: boolean;
  completed: boolean;
};

type ProviderState = {
  voucher?: {
    id: number;
    discountAmount: number;
    usageCounted?: boolean;
  };
  deposit?: unknown;
  depositCallback?: unknown;
  productOrder?: FlowixTransaction | SupplierOrder;
  productCallback?: unknown;
  orderSubmitError?: string;
  paymentHoldReason?: string;
  voucherUsageError?: string;
  lastCallback?: unknown;
};

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function nested(payload: Record<string, unknown>) {
  const data = payload.data;
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function getCandidate(
  payload: Record<string, unknown>,
  keys: string[],
): string {
  const data = nested(payload);
  for (const key of keys) {
    const value = safeString(payload[key]) || safeString(data[key]);
    if (value) return value;
  }
  return "";
}

function getNumberCandidate(payload: Record<string, unknown>, keys: string[]) {
  const value = getCandidate(payload, keys);
  if (!value) return 0;
  const normalized = value.replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getInvoiceNumber(payload: Record<string, unknown>): string {
  return getCandidate(payload, [
    "invoiceNumber",
    "invoice_number",
    "invoice",
    "merchant_ref",
    "merchantReference",
    "reference",
    "external_id",
    "externalId",
    "order_id",
    "orderId",
  ]);
}

function getFlowixStatus(payload: Record<string, unknown>): string {
  return getCandidate(payload, [
    "status",
    "payment_status",
    "paymentStatus",
    "transaction_status",
    "transactionStatus",
  ]).toLowerCase();
}

function getFlowixEvent(payload: Record<string, unknown>, headerEvent?: string) {
  return (
    safeString(payload.event) ||
    safeString(nested(payload).event) ||
    headerEvent ||
    ""
  ).toLowerCase();
}

export function mapStatus(status: string): FlowixStatusUpdate {
  if (["paid", "success", "settlement", "settled", "completed", "capture"].includes(status)) {
    return {
      status: "success",
      paymentStatus: "paid",
      paid: true,
      completed: true,
    };
  }

  if (["processing", "process"].includes(status)) {
    return {
      status: "pending",
      paymentStatus: "unpaid",
      paid: false,
      completed: false,
    };
  }

  if (["expired", "expire", "cancelled", "canceled"].includes(status)) {
    return {
      status: "cancelled",
      paymentStatus: "expired",
      paid: false,
      completed: false,
    };
  }

  if (["refund", "refunded"].includes(status)) {
    return {
      status: "refunded",
      paymentStatus: "refunded",
      paid: false,
      completed: false,
    };
  }

  if (["failed", "failure", "deny", "denied"].includes(status)) {
    return {
      status: "failed",
      paymentStatus: "unpaid",
      paid: false,
      completed: false,
    };
  }

  return {
    status: "pending",
    paymentStatus: "unpaid",
    paid: false,
    completed: false,
  };
}

function productTransactionStatus(status: string): TransactionStatus {
  if (["paid", "success", "settlement", "settled", "completed", "capture"].includes(status)) {
    return "success";
  }
  if (["failed", "failure", "deny", "denied"].includes(status)) {
    return "failed";
  }
  if (["expired", "expire", "cancelled", "canceled"].includes(status)) {
    return "cancelled";
  }
  if (["refund", "refunded"].includes(status)) {
    return "refunded";
  }
  return "processing";
}

function parseProviderState(raw: string | null): ProviderState {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as ProviderState & Record<string, unknown>;
    if (
      parsed &&
      typeof parsed === "object" &&
      ("deposit" in parsed ||
        "voucher" in parsed ||
        "productOrder" in parsed ||
        "depositCallback" in parsed ||
        "productCallback" in parsed)
    ) {
      return parsed;
    }

    return { deposit: parsed };
  } catch {
    return {};
  }
}

function stringifyProviderState(
  raw: string | null,
  patch: Partial<ProviderState>,
) {
  return JSON.stringify({
    ...parseProviderState(raw),
    ...patch,
  });
}

async function countVoucherUsageOnce(state: ProviderState) {
  if (!state.voucher || state.voucher.usageCounted) return state;

  const now = new Date();
  const counted = await getDb()
    .update(vouchers)
    .set({ usageCount: sql`${vouchers.usageCount} + 1` })
    .where(
      and(
        eq(vouchers.id, state.voucher.id),
        eq(vouchers.isActive, true),
        lte(vouchers.validFrom, now),
        gte(vouchers.validUntil, now),
        sql`${vouchers.usageCount} < ${vouchers.usageLimit}`,
      ),
    )
    .returning({ id: vouchers.id });

  if (counted.length === 0) {
    return {
      ...state,
      voucherUsageError: "Voucher tidak dihitung karena sudah tidak valid atau limitnya sudah habis saat order selesai.",
    };
  }

  return {
    ...state,
    voucher: {
      ...state.voucher,
      usageCounted: true,
    },
    voucherUsageError: undefined,
  };
}

async function submitFlowixProductOrder(transaction: {
  invoiceNumber: string;
  supplierProvider: string | null;
  providerProductCode: string | null;
  productCost?: number;
  playerId: string;
  serverId: string | null;
  providerReference: string | null;
  providerResponse: string | null;
  supplierTargetFormat?: string | null;
}) {
  const state = parseProviderState(transaction.providerResponse);
  const existingOrder = state.productOrder as SupplierOrder | FlowixTransaction | undefined;
  const existingOrderRef =
    "reference" in (existingOrder || {})
      ? (existingOrder as SupplierOrder).reference
      : (existingOrder as FlowixTransaction | undefined)?.reff_id;
  if (existingOrderRef) {
    if (transaction.supplierProvider === "digiflazz") {
      return checkSupplierOrder({
        provider: transaction.supplierProvider,
        productCode: transaction.providerProductCode,
        productCost: transaction.productCost,
        playerId: transaction.playerId,
        serverId: transaction.serverId,
        invoiceNumber: transaction.invoiceNumber,
        targetFormat: transaction.supplierTargetFormat,
        reference: existingOrderRef,
      }).catch(() => state.productOrder as SupplierOrder);
    }
    return checkFlowixTransaction(existingOrderRef).catch(() => state.productOrder);
  }

  return submitSupplierOrder({
    provider: transaction.supplierProvider,
    productCode: transaction.providerProductCode,
    productCost: transaction.productCost,
    playerId: transaction.playerId,
    serverId: transaction.serverId,
    invoiceNumber: transaction.invoiceNumber,
    targetFormat: transaction.supplierTargetFormat,
  });
}

async function deactivateUnavailableProduct(input: {
  productId: number | null;
  error: unknown;
}) {
  if (!input.productId || !isFlowixProductUnavailableError(input.error)) return;

  await getDb()
    .update(products)
    .set({ isActive: false })
    .where(eq(products.id, input.productId));
}

function verifySignature(rawBody: string, signature: string | undefined) {
  if (!env.flowixWebhookSecret) {
    return !env.isProduction;
  }

  if (!signature) return false;

  const expected = createHmac("sha256", env.flowixWebhookSecret)
    .update(rawBody)
    .digest("hex");
  const received = signature.replace(/^sha256=/i, "").trim();

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

async function logFlowixEvent(input: {
  action: string;
  entityType: string;
  entityId?: number;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}) {
  try {
    await getDb().insert(activityLogs).values(input);
  } catch (error) {
    console.warn("[flowix] Failed to write activity log", error);
  }
}

export async function handleFlowixCallback(c: Context) {
  const rawBody = await c.req.text();
  const signature = c.req.header("X-Flowix-Signature");
  const headerEvent = c.req.header("X-Flowix-Event");

  if (!verifySignature(rawBody, signature)) {
    return c.json({ success: false, message: "Invalid signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ success: false, message: "Invalid JSON payload" }, 400);
  }

  const invoiceNumber = getInvoiceNumber(payload);
  const providerReference = getCandidate(payload, ["reff_id", "ref_id", "reference"]);
  const providerPaymentId = getCandidate(payload, [
    "pay_id",
    "payment_id",
    "paymentId",
    "provider_ref",
  ]);
  const lookup = invoiceNumber || providerReference || providerPaymentId;
  if (!lookup) {
    await logFlowixEvent({
      action: "flowix_callback_test",
      entityType: "webhook",
      details: payload,
      ipAddress: c.req.header("x-forwarded-for") || "",
      userAgent: c.req.header("user-agent") || "",
    });

    return c.json({
      success: true,
      message: "Webhook received. No transaction reference was provided.",
    });
  }

  const status = mapStatus(getFlowixStatus(payload));
  const event = getFlowixEvent(payload, headerEvent);
  const now = new Date();
  return withTransactionLock(`flowix-callback:${lookup}`, async (db) => {
  let matched:
    | {
        id: number;
        invoiceNumber: string;
        playerId: string;
        serverId: string | null;
        status: TransactionStatus;
        paymentStatus: PaymentStatus;
        providerProductCode: string | null;
        supplierProvider: string | null;
        productId: number | null;
        providerReference: string | null;
        providerPaymentId: string | null;
        providerResponse: string | null;
        totalAmount: string;
        productCost: string | null;
        supplierTargetFormat: string | null;
      }
    | undefined;
  try {
    const rows = await db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        playerId: transactions.playerId,
        serverId: transactions.serverId,
        status: transactions.status,
        paymentStatus: transactions.paymentStatus,
        providerProductCode: transactions.providerProductCode,
        supplierProvider: transactions.supplierProvider,
        productId: transactions.productId,
        providerReference: transactions.providerReference,
        providerPaymentId: transactions.providerPaymentId,
        providerResponse: transactions.providerResponse,
        totalAmount: transactions.totalAmount,
        productCost: products.basePrice,
        supplierTargetFormat: products.supplierTargetFormat,
      })
      .from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .where(
        or(
          eq(transactions.invoiceNumber, lookup),
          eq(transactions.providerReference, lookup),
          eq(transactions.providerPaymentId, lookup),
        ),
      )
      .limit(1);
    matched = rows[0];
  } catch (error) {
    console.error("[flowix] Failed to find transaction", error);
    return c.json({
      success: true,
      message: "Webhook received. Transaction lookup failed and was skipped.",
      reference: lookup,
    });
  }

  if (!matched) {
    await logFlowixEvent({
      action: "flowix_callback_unmatched",
      entityType: "transaction",
      details: payload,
      ipAddress: c.req.header("x-forwarded-for") || "",
      userAgent: c.req.header("user-agent") || "",
    });

    return c.json({
      success: true,
      message: "Webhook received. Transaction not found.",
      reference: lookup,
    });
  }

  let nextStatus = status.status;
  let nextPaymentStatus = status.paymentStatus;
  const transactionIsClosed =
    matched.status === "failed" ||
    matched.status === "cancelled" ||
    matched.status === "refunded" ||
    matched.paymentStatus === "expired" ||
    matched.paymentStatus === "refunded";
  const isProductCallback = event === "transaction.status" || providerReference.startsWith("TRX-");
  const amountReceived = getNumberCandidate(payload, [
    "amount_received",
    "amountReceived",
    "paid_amount",
    "paidAmount",
    "amount_paid",
    "amountPaid",
  ]);
  const expectedAmount = Math.round(Number(matched.totalAmount || 0));
  const receivedAmountIsEnough = amountReceived > 0 && amountReceived >= expectedAmount;
  const paymentAlreadyPaid = matched.paymentStatus === "paid";
  const canProceedWithPaidCallback = paymentAlreadyPaid || receivedAmountIsEnough;
  const previousProviderState = parseProviderState(matched.providerResponse);
  let providerResponse = stringifyProviderState(matched.providerResponse, {
    lastCallback: payload,
  });
  let nextProviderReference = matched.providerReference;
  let completedAt: Date | null | undefined = status.completed ? now : undefined;

  if (transactionIsClosed) {
    const providerResponse = stringifyProviderState(matched.providerResponse, {
      lastCallback: payload,
      paymentHoldReason: "Callback ignored because transaction is already closed.",
    });

    await db
      .update(transactions)
      .set({ providerResponse })
      .where(eq(transactions.id, matched.id));

    await logFlowixEvent({
      action: "flowix_callback_ignored_closed",
      entityType: "transaction",
      entityId: matched.id,
      details: payload,
      ipAddress: c.req.header("x-forwarded-for") || "",
      userAgent: c.req.header("user-agent") || "",
    });

    return c.json({
      success: true,
      invoiceNumber: matched.invoiceNumber,
      status: matched.status,
      paymentStatus: matched.paymentStatus,
      message: "Transaction is already closed.",
    });
  }

  if (isProductCallback) {
    if (matched.paymentStatus !== "paid") {
      providerResponse = stringifyProviderState(matched.providerResponse, {
        productCallback: payload,
        lastCallback: payload,
        paymentHoldReason: "Product callback ignored because deposit payment is not paid yet.",
      });
      nextStatus = matched.status;
      nextPaymentStatus = matched.paymentStatus;
      completedAt = undefined;
    } else {
      nextStatus = productTransactionStatus(getFlowixStatus(payload));
      nextPaymentStatus = "paid";
      providerResponse = stringifyProviderState(matched.providerResponse, {
        productCallback: payload,
        lastCallback: payload,
      });
      if (nextStatus === "failed") {
        await deactivateUnavailableProduct({
          productId: matched.productId,
          error: JSON.stringify(payload),
        });
      }
      completedAt = nextStatus === "success" ? now : undefined;
    }
  } else if (status.paid) {
    if (!canProceedWithPaidCallback) {
      nextPaymentStatus = "unpaid";
      nextStatus = "pending";
      completedAt = undefined;
      providerResponse = stringifyProviderState(matched.providerResponse, {
        depositCallback: payload,
        lastCallback: payload,
        paymentHoldReason: `Payment callback held: received Rp${amountReceived.toLocaleString("id-ID")} of expected Rp${expectedAmount.toLocaleString("id-ID")}.`,
      });
    } else {
      nextPaymentStatus = "paid";
      nextStatus = "processing";
      completedAt = undefined;
      try {
        const productOrder = await submitFlowixProductOrder({
          ...matched,
          productCost: Number(matched.productCost || 0),
        });
        const orderStatus =
          "provider" in (productOrder || {})
            ? (productOrder as SupplierOrder).status
            : productTransactionStatus((productOrder as FlowixTransaction | undefined)?.status || "processing");
        nextStatus = orderStatus;
        nextProviderReference =
          ("provider" in (productOrder || {})
            ? (productOrder as SupplierOrder).reference
            : (productOrder as FlowixTransaction | undefined)?.reff_id) || matched.providerReference;
        completedAt = orderStatus === "success" ? now : undefined;
        providerResponse = stringifyProviderState(matched.providerResponse, {
          depositCallback: payload,
          productOrder,
          lastCallback: payload,
          orderSubmitError: undefined,
          paymentHoldReason: undefined,
        });
      } catch (error) {
        await deactivateUnavailableProduct({
          productId: matched.productId,
          error,
        });
        nextStatus = "failed";
        providerResponse = stringifyProviderState(matched.providerResponse, {
          depositCallback: payload,
          orderSubmitError:
            error instanceof Error ? error.message : "Gagal mengirim order produk Flowix.",
          lastCallback: payload,
        });
        console.error("[flowix] Failed to submit product order", error);
      }
    }
  } else {
    providerResponse = stringifyProviderState(matched.providerResponse, {
      depositCallback: payload,
      lastCallback: payload,
    });
  }

  try {
    if (nextPaymentStatus === "paid" && nextStatus === "success") {
      const countedProviderState = await countVoucherUsageOnce({
        ...parseProviderState(providerResponse),
        voucher: previousProviderState.voucher,
      });
      providerResponse = JSON.stringify(countedProviderState);
    }

    await db
      .update(transactions)
      .set({
        status: nextStatus,
        paymentStatus: nextPaymentStatus,
        providerReference: nextProviderReference,
        providerResponse,
        ...(!isProductCallback && status.paid && receivedAmountIsEnough && !paymentAlreadyPaid
          ? { paidAt: now }
          : {}),
        ...(completedAt ? { completedAt } : {}),
      })
      .where(eq(transactions.id, matched.id));
  } catch (error) {
    console.error("[flowix] Failed to update transaction", error);
    return c.json({
      success: true,
      message: "Webhook received. Transaction update failed and was skipped.",
      reference: lookup,
    });
  }

  await logFlowixEvent({
    action: "flowix_callback",
    entityType: "transaction",
    entityId: matched.id,
    details: payload,
    ipAddress: c.req.header("x-forwarded-for") || "",
    userAgent: c.req.header("user-agent") || "",
  });

  return c.json({
    success: true,
    invoiceNumber: matched.invoiceNumber,
    status: nextStatus,
    paymentStatus: nextPaymentStatus,
  });
  });
}
