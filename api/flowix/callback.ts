import type { Context } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { env } from "../lib/env";
import { getDb } from "../queries/connection";
import { activityLogs, transactions } from "@db/schema";

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

function mapStatus(status: string): FlowixStatusUpdate {
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
      status: "processing",
      paymentStatus: "paid",
      paid: true,
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
  const providerPaymentId = getCandidate(payload, ["pay_id", "payment_id", "paymentId"]);
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
  const now = new Date();
  const updateData = {
    status: status.status,
    paymentStatus: status.paymentStatus,
    providerResponse: JSON.stringify(payload),
    ...(status.paid ? { paidAt: now } : {}),
    ...(status.completed ? { completedAt: now } : {}),
  };

  const db = getDb();
  let updated: Array<{ id: number; invoiceNumber: string }> = [];
  try {
    updated = await db
      .update(transactions)
      .set(updateData)
      .where(
        or(
          eq(transactions.invoiceNumber, lookup),
          eq(transactions.providerReference, lookup),
          eq(transactions.providerPaymentId, lookup),
        ),
      )
      .returning({ id: transactions.id, invoiceNumber: transactions.invoiceNumber });
  } catch (error) {
    console.error("[flowix] Failed to update transaction", error);
    return c.json({
      success: true,
      message: "Webhook received. Transaction update failed and was skipped.",
      reference: lookup,
    });
  }

  if (updated.length === 0) {
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

  await logFlowixEvent({
    action: "flowix_callback",
    entityType: "transaction",
    entityId: updated[0].id,
    details: payload,
    ipAddress: c.req.header("x-forwarded-for") || "",
    userAgent: c.req.header("user-agent") || "",
  });

  return c.json({
    success: true,
    invoiceNumber: updated[0].invoiceNumber,
    status: status.status,
    paymentStatus: status.paymentStatus,
  });
}
