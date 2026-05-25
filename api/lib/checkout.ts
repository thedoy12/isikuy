export function checkoutAmounts(input: {
  baseAmount: number;
  discountAmount?: number;
  feePercent?: number;
  feeFixed?: number;
}) {
  const baseAmount = Math.max(0, Math.round(input.baseAmount));
  const discountAmount = Math.min(
    baseAmount,
    Math.max(0, Math.round(input.discountAmount ?? 0)),
  );
  const subtotal = Math.max(0, baseAmount - discountAmount);
  const feePercent = Math.max(0, input.feePercent ?? 0);
  const feeFixed = Math.max(0, input.feeFixed ?? 0);
  const feeAmount = Math.round(subtotal * (feePercent / 100) + feeFixed);
  const totalAmount = Math.max(1, subtotal + feeAmount);

  return {
    baseAmount,
    discountAmount,
    feeAmount,
    totalAmount,
  };
}
