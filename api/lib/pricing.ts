import { env } from "./env";

export function priceWithMarkup(price: number, markupPercent = env.productMarkupPercent) {
  return Math.ceil((price * (1 + markupPercent / 100)) / 100) * 100;
}

export function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function safeDiscountAmount(input: {
  amount: number;
  rawDiscount: number;
  costFloor?: number;
}) {
  const maxByAmount = Math.max(0, Math.round(input.amount));
  const maxByMargin =
    input.costFloor === undefined
      ? maxByAmount
      : Math.max(0, Math.floor(input.amount - input.costFloor));
  return Math.min(Math.round(input.rawDiscount), maxByAmount, maxByMargin);
}
