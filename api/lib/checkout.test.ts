import { describe, expect, it } from "vitest";
import { checkoutAmounts } from "./checkout";
import { safeDiscountAmount } from "./pricing";

describe("checkoutAmounts", () => {
  it("calculates checkout totals from server-side price and voucher discount", () => {
    expect(checkoutAmounts({ baseAmount: 50_000, discountAmount: 7_500 })).toEqual({
      baseAmount: 50_000,
      discountAmount: 7_500,
      feeAmount: 0,
      totalAmount: 42_500,
    });
  });

  it("never lets a voucher make the payable amount zero or negative", () => {
    expect(checkoutAmounts({ baseAmount: 10_000, discountAmount: 25_000 }).totalAmount).toBe(1);
    expect(safeDiscountAmount({ amount: 10_000, rawDiscount: 25_000 })).toBe(10_000);
  });

  it("adds configurable checkout fees after discounts", () => {
    expect(
      checkoutAmounts({
        baseAmount: 50_000,
        discountAmount: 10_000,
        feePercent: 1.5,
        feeFixed: 500,
      }),
    ).toMatchObject({
      feeAmount: 1_100,
      totalAmount: 41_100,
    });
  });
});
