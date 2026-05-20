import { env } from "./env";

function ceilToIncrement(amount: number, increment: number) {
  return Math.ceil(amount / increment) * increment;
}

function tieredMarkupRule(price: number) {
  if (price < 2_000) return { percent: 2, rounding: 25 };
  if (price < 5_000) return { percent: 2, rounding: 50 };
  if (price < 50_000) return { percent: 2, rounding: 100 };
  return { percent: 1.5, rounding: 100 };
}

export function priceWithMarkup(price: number, markupPercent = env.productMarkupPercent) {
  const rule = tieredMarkupRule(price);
  const percent = markupPercent ?? rule.percent;
  return ceilToIncrement(price * (1 + percent / 100), rule.rounding);
}

export function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function safeDiscountAmount(input: {
  amount: number;
  rawDiscount: number;
}) {
  const maxByAmount = Math.max(0, Math.round(input.amount));
  return Math.min(Math.round(input.rawDiscount), maxByAmount);
}
