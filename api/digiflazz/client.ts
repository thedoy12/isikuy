import { createHash } from "node:crypto";
import { env } from "../lib/env";

type DigiflazzEnvelope<T> = {
  data: T;
};

export type DigiflazzProduct = {
  product_name: string;
  category: string;
  brand: string;
  type: string;
  seller_name?: string;
  price: number;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock?: boolean;
  stock?: number;
  multi?: boolean;
  start_cut_off?: string;
  end_cut_off?: string;
  desc?: string;
};

export type DigiflazzTransaction = {
  ref_id: string;
  customer_no: string;
  buyer_sku_code: string;
  message: string;
  status: "Sukses" | "Gagal" | "Pending" | string;
  rc: string;
  sn?: string;
  buyer_last_saldo?: number;
  price?: number;
  tele?: string;
  wa?: string;
};

function assertConfigured() {
  if (!env.digiflazzUsername || !env.digiflazzApiKey) {
    throw new Error("Username dan API key Digiflazz belum diisi.");
  }
}

function sign(seed: string) {
  return createHash("md5").update(seed).digest("hex");
}

export function isDigiflazzConfigured() {
  return !!env.digiflazzUsername && !!env.digiflazzApiKey;
}

async function request<T>(path: string, body: Record<string, unknown>) {
  assertConfigured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let response: Response;
  try {
    response = await fetch(`${env.digiflazzBaseUrl}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Digiflazz terlalu lama merespons. Coba lagi sebentar.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as
    | DigiflazzEnvelope<T>
    | { data?: T; message?: string }
    | null;

  if (!response.ok || !payload?.data) {
    const message =
      payload && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "";
    throw new Error(
      message || `Digiflazz request failed with status ${response.status}`,
    );
  }

  return payload.data as T;
}

export async function listDigiflazzProducts() {
  const data = await request<DigiflazzProduct[]>("/price-list", {
    cmd: "prepaid",
    username: env.digiflazzUsername,
    sign: sign(`${env.digiflazzUsername}${env.digiflazzApiKey}pricelist`),
  });

  return data;
}

export function isActiveDigiflazzProduct(product: DigiflazzProduct | undefined) {
  if (!product) return false;
  if (product.buyer_product_status === false) return false;
  if (product.seller_product_status === false) return false;
  if (product.unlimited_stock) return true;
  return (product.stock ?? 1) > 0;
}

export async function createDigiflazzTransaction(input: {
  skuCode: string;
  customerNo: string;
  refId: string;
  maxPrice?: number;
}) {
  const data = await request<DigiflazzTransaction>("/transaction", {
    username: env.digiflazzUsername,
    buyer_sku_code: input.skuCode,
    customer_no: input.customerNo,
    ref_id: input.refId,
    sign: sign(`${env.digiflazzUsername}${env.digiflazzApiKey}${input.refId}`),
    ...(input.maxPrice ? { max_price: input.maxPrice } : {}),
    ...(env.digiflazzTesting ? { testing: true } : {}),
  });

  return data;
}

export async function checkDigiflazzTransaction(input: {
  skuCode: string;
  customerNo: string;
  refId: string;
}) {
  return createDigiflazzTransaction(input);
}
