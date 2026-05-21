export function checkoutAmounts(input: {
  baseAmount: number;
  discountAmount?: number;
}) {
  const baseAmount = Math.max(0, Math.round(input.baseAmount));
  const discountAmount = Math.min(
    baseAmount,
    Math.max(0, Math.round(input.discountAmount ?? 0)),
  );
  const feeAmount = 0;
  const totalAmount = Math.max(1, baseAmount - discountAmount + feeAmount);

  return {
    baseAmount,
    discountAmount,
    feeAmount,
    totalAmount,
  };
}
