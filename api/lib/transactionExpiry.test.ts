import { describe, expect, it } from "vitest";
import { isUnpaidExpirableStatus } from "./transactionExpiry";

describe("transaction expiry status guard", () => {
  it("expires unpaid waiting payment statuses", () => {
    expect(isUnpaidExpirableStatus("pending", "unpaid")).toBe(true);
    expect(isUnpaidExpirableStatus("processing", "unpaid")).toBe(true);
  });

  it("does not expire paid or closed payments", () => {
    expect(isUnpaidExpirableStatus("processing", "paid")).toBe(false);
    expect(isUnpaidExpirableStatus("success", "paid")).toBe(false);
    expect(isUnpaidExpirableStatus("failed", "expired")).toBe(false);
  });
});
