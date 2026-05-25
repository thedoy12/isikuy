import {
  checkFlowixTransaction,
  createFlowixTransaction,
  type FlowixTransaction,
} from "../flowix/client";
import {
  checkDigiflazzTransaction,
  createDigiflazzTransaction,
  type DigiflazzTransaction,
} from "../digiflazz/client";

export type SupplierProvider = "flowix" | "digiflazz";
export type SupplierStatus =
  | "processing"
  | "success"
  | "failed"
  | "cancelled"
  | "refunded";

export type SupplierOrder = {
  provider: SupplierProvider;
  reference: string | null;
  status: SupplierStatus;
  raw: FlowixTransaction | DigiflazzTransaction;
};

type SupplierOrderInput = {
  provider?: string | null;
  productCode: string | null;
  productCost?: number;
  playerId: string;
  serverId: string | null;
  invoiceNumber: string;
  targetFormat?: string | null;
};

function providerOf(value?: string | null): SupplierProvider {
  return value?.toLowerCase() === "digiflazz" ? "digiflazz" : "flowix";
}

export function supplierTarget(input: {
  provider?: string | null;
  playerId: string;
  serverId?: string | null;
  targetFormat?: string | null;
}) {
  const format = input.targetFormat || "auto";
  const serverId = input.serverId?.trim();
  const playerId = input.playerId.trim();

  if (!serverId || format === "player") return playerId;
  if (format === "pipe") return `${playerId}|${serverId}`;
  if (format === "dash") return `${playerId}-${serverId}`;
  if (format === "space") return `${playerId} ${serverId}`;
  if (format === "comma") return `${playerId},${serverId}`;

  return providerOf(input.provider) === "digiflazz"
    ? `${playerId}${serverId}`
    : playerId;
}

export function mapSupplierStatus(provider: string | null | undefined, status: string) {
  const normalized = status.toLowerCase();
  if (providerOf(provider) === "digiflazz") {
    if (normalized === "sukses") return "success" as const;
    if (normalized === "gagal") return "failed" as const;
    return "processing" as const;
  }

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

export async function submitSupplierOrder(input: SupplierOrderInput) {
  if (!input.productCode) {
    throw new Error("Kode produk supplier kosong, order tidak bisa dikirim.");
  }

  const provider = providerOf(input.provider);
  if (provider === "digiflazz") {
    const order = await createDigiflazzTransaction({
      skuCode: input.productCode,
      customerNo: supplierTarget(input),
      refId: input.invoiceNumber,
      maxPrice: input.productCost ? Math.ceil(input.productCost) : undefined,
    });

    return {
      provider,
      reference: order.ref_id || input.invoiceNumber,
      status: mapSupplierStatus(provider, order.status),
      raw: order,
    } satisfies SupplierOrder;
  }

  const order = await createFlowixTransaction({
    serviceCode: input.productCode,
    target: input.playerId,
    zone: input.serverId,
  });

  return {
    provider,
    reference: order.reff_id || null,
    status: mapSupplierStatus(provider, order.status),
    raw: order,
  } satisfies SupplierOrder;
}

export async function checkSupplierOrder(input: SupplierOrderInput & { reference: string }) {
  const provider = providerOf(input.provider);
  if (provider === "digiflazz") {
    const order = await checkDigiflazzTransaction({
      skuCode: input.productCode || "",
      customerNo: supplierTarget(input),
      refId: input.reference,
    });
    return {
      provider,
      reference: order.ref_id || input.reference,
      status: mapSupplierStatus(provider, order.status),
      raw: order,
    } satisfies SupplierOrder;
  }

  const order = await checkFlowixTransaction(input.reference);
  return {
    provider,
    reference: order.reff_id || input.reference,
    status: mapSupplierStatus(provider, order.status),
    raw: order,
  } satisfies SupplierOrder;
}
