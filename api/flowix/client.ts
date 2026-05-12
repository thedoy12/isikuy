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
};

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

export async function listFlowixProducts(category = "game") {
  const response = await request<FlowixProduct[]>(
    `/product?category=${encodeURIComponent(category)}`,
  );

  return response.data;
}
