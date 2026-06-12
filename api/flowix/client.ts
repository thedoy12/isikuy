import { env } from "../lib/env";
import { getCommerceSettings } from "../lib/commerceSettings";

type FlowixResponse<T> = {
  success: boolean;
  code: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

type FlowixRequestInit = RequestInit & {
  timeoutMs?: number;
};

export type FlowixDeposit = {
  reff_id: string;
  pay_id: string;
  amount_total: number;
  amount_received: number;
  method: string;
  pay_url: string | null;
  pay_code: string | null;
  qr_string: string | null;
  qr_image: string | null;
  instructions?: Array<{
    title: string;
    steps: string[];
  }>;
  expired_at: string;
};

export type FlowixDepositStatus = {
  reff_id: string;
  pay_id: string;
  method: string;
  amount: number;
  status: string;
  date?: string;
};

export type FlowixProduct = {
  code: string;
  name: string;
  brand: string;
  status: string;
  raw_status?: string;
  availability_label?: string;
  is_available?: boolean;
  stock?: number | null;
  price: number;
  category?: string;
  sourceCategory?: string;
};

export type FlowixTransaction = {
  reff_id: string;
  status: string;
  sn?: string;
  note?: string;
  price?: number;
  balance_left?: number;
  service_code?: string;
  service_name?: string;
  target?: string;
  selling_price?: number;
  createdAt?: string;
};

export type FlowixProfile = {
  merchant_id: string;
  username: string;
  email?: string;
  financials?: {
    balance?: number;
    balance_limit?: number;
  };
};

export class FlowixCatalogUnavailableError extends Error {
  constructor(message = "Katalog produk Flowix belum bisa dimuat.") {
    super(message);
    this.name = "FlowixCatalogUnavailableError";
  }
}

function normalizeFlowixCategory(value?: string) {
  const slug = (value || "produk")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const aliases: Record<string, string> = {
    games: "game",
    "game-online": "game",
    "top-up-game": "game",
    "topup-game": "game",
    "voucher-game": "game",
    "e-wallet": "ewallet",
    "e-walet": "ewallet",
    "e-money": "ewallet",
    "dompet-digital": "ewallet",
    "paket-data": "data",
    "data-internet": "data",
    internet: "data",
    "token-pln": "pln",
    listrik: "pln",
  };
  return aliases[slug] ?? slug;
}

function categoryRank(value?: string) {
  const category = normalizeFlowixCategory(value);
  const rank: Record<string, number> = {
    game: 1,
    pulsa: 2,
    data: 3,
    ewallet: 4,
    voucher: 5,
    pln: 6,
    produk: 99,
  };
  return rank[category] ?? 50;
}

function shouldReplaceProduct(current: FlowixProduct, next: FlowixProduct) {
  const currentRank = categoryRank(current.sourceCategory || current.category);
  const nextRank = categoryRank(next.sourceCategory || next.category);
  if (nextRank !== currentRank) return nextRank < currentRank;
  if (next.status.toLowerCase() === "aktif" && current.status.toLowerCase() !== "aktif") return true;
  return false;
}

function assertConfigured() {
  if (!env.flowixApiKey || !env.flowixMerchantId) {
    throw new Error("Flowix API key dan merchant ID belum diisi.");
  }
}

export function isFlowixConfigured() {
  return !!env.flowixApiKey && !!env.flowixMerchantId;
}

async function request<T>(
  path: string,
  init: FlowixRequestInit = {},
): Promise<FlowixResponse<T>> {
  assertConfigured();
  const { timeoutMs = 15_000, ...fetchInit } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${env.flowixBaseUrl}${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        api_key: env.flowixApiKey,
        merchant_id: env.flowixMerchantId,
        ...(fetchInit.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Flowix terlalu lama merespons. Coba buat QRIS lagi.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as
    | FlowixResponse<T>
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.message || `Flowix request failed with status ${response.status}`,
    );
  }

  return payload;
}

export async function createFlowixDeposit(input: {
  amount: number;
  methodCode?: string;
  feeByCustomer?: boolean;
}) {
  const response = await request<FlowixDeposit>("/deposit", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      method_code: input.methodCode ?? "QRIS",
      fee_by_customer: input.feeByCustomer ?? true,
    }),
  });

  return response.data;
}

export async function checkFlowixDeposit(reffId: string) {
  const response = await request<FlowixDepositStatus>(
    `/deposit/${encodeURIComponent(reffId)}`,
  );

  return response.data;
}

export async function getFlowixProfile() {
  const response = await request<FlowixProfile>("/profile");
  return response.data;
}

export async function createFlowixTransaction(input: {
  serviceCode: string;
  target: string;
  zone?: string | null;
  qty?: number;
}) {
  const response = await request<FlowixTransaction>("/product", {
    method: "POST",
    body: JSON.stringify({
      service_code: input.serviceCode,
      target: input.target,
      ...(input.zone ? { zone: input.zone } : {}),
      ...(input.qty ? { qty: input.qty } : {}),
    }),
  });

  return response.data;
}

export async function checkFlowixTransaction(reffId: string) {
  const response = await request<FlowixTransaction>(
    `/product/${encodeURIComponent(reffId)}`,
  );

  return response.data;
}

export async function listFlowixProducts(category?: string, input?: { timeoutMs?: number }) {
  const path = category ? `/product?category=${encodeURIComponent(category)}` : "/product";
  const response = await request<FlowixProduct[]>(path, { timeoutMs: input?.timeoutMs });

  return response.data.map((product) => ({
    ...product,
    sourceCategory: normalizeFlowixCategory(product.category || category || "produk"),
  }));
}

export function isActiveFlowixProduct(product: FlowixProduct | undefined) {
  if (!product) return false;
  if (product.is_available === false) return false;
  if (product.stock === 0) return false;

  const status = product.status.toLowerCase().trim();
  const rawStatus = product.raw_status?.toLowerCase().trim();
  const availability = product.availability_label?.toLowerCase().trim();

  if (["empty", "inactive", "disabled", "unavailable"].includes(rawStatus || "")) return false;
  if (availability && !["tersedia", "available"].includes(availability)) return false;

  return status === "aktif" || status === "active" || rawStatus === "available";
}

export function isFlowixProductUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /product.*unavailable|unavailable|tidak tersedia|not available|nonaktif|inactive/i.test(
    message,
  );
}

export async function ensureFlowixProductAvailable(serviceCode: string | null | undefined) {
  if (!serviceCode) {
    throw new Error("Kode produk Flowix kosong.");
  }

  const products = await listFlowixCatalog({ strict: true });
  const product = products.find(
    (item) => item.code.toLowerCase() === serviceCode.toLowerCase(),
  );

  if (!isActiveFlowixProduct(product)) {
    throw new Error("Produk sedang tidak tersedia di Flowix. Silakan pilih produk lain.");
  }

  return product;
}

export async function warnIfFlowixProductUnavailable(serviceCode: string | null | undefined) {
  if (!serviceCode) {
    throw new Error("Kode produk Flowix kosong.");
  }

  const products = await listFlowixCatalog({ strict: false });
  if (products.length === 0) return;

  const product = products.find(
    (item) => item.code.toLowerCase() === serviceCode.toLowerCase(),
  );

  if (product && !isActiveFlowixProduct(product)) {
    throw new Error("Produk sedang tidak tersedia di Flowix. Silakan pilih produk lain.");
  }
}

export async function listFlowixCatalog(input?: { categories?: string[]; strict?: boolean; timeoutMs?: number }) {
  const commerceSettings = input?.categories
    ? null
    : await getCommerceSettings().catch(() => null);
  const categories = Array.from(
    new Set(input?.categories || commerceSettings?.flowixProductCategories || env.flowixProductCategories),
  );
  const requests = [undefined, ...categories].map((category) =>
    listFlowixProducts(category, { timeoutMs: input?.timeoutMs }).then(
      (products) => ({ category, products }),
      (error) => {
        console.warn(
          `[flowix] Failed to load products${category ? ` for ${category}` : ""}`,
          error,
        );
        if (input?.strict) {
          throw new FlowixCatalogUnavailableError(
            error instanceof Error ? error.message : undefined,
          );
        }
        return { category, products: [] as FlowixProduct[] };
      },
    ),
  );
  const groups = await Promise.all(requests);
  const productsByKey = new Map<string, FlowixProduct>();

  for (const product of groups.flatMap((group) => group.products)) {
    const key = product.code || [
      normalizeFlowixCategory(product.sourceCategory || product.category),
      product.brand || "",
      product.name || "",
    ].join(":");
    const existing = productsByKey.get(key);
    if (!existing || shouldReplaceProduct(existing, product)) {
      productsByKey.set(key, product);
    }
  }

  return Array.from(productsByKey.values());
}
