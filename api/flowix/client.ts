import { env } from "../lib/env";

type FlowixResponse<T> = {
  success: boolean;
  code: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
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

export type FlowixProduct = {
  code: string;
  name: string;
  brand: string;
  status: string;
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
  init: RequestInit = {},
): Promise<FlowixResponse<T>> {
  assertConfigured();

  const response = await fetch(`${env.flowixBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      api_key: env.flowixApiKey,
      merchant_id: env.flowixMerchantId,
      ...(init.headers ?? {}),
    },
  });

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

export async function listFlowixProducts(category?: string) {
  const path = category ? `/product?category=${encodeURIComponent(category)}` : "/product";
  const response = await request<FlowixProduct[]>(path);

  return response.data.map((product) => ({
    ...product,
    sourceCategory: normalizeFlowixCategory(product.category || category || "produk"),
  }));
}

export async function listFlowixCatalog() {
  const categories = Array.from(new Set(env.flowixProductCategories));
  const requests = [undefined, ...categories].map((category) =>
    listFlowixProducts(category).catch((error) => {
      console.warn(
        `[flowix] Failed to load products${category ? ` for ${category}` : ""}`,
        error,
      );
      return [] as FlowixProduct[];
    }),
  );
  const groups = await Promise.all(requests);
  const productsByKey = new Map<string, FlowixProduct>();

  for (const product of groups.flat()) {
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
