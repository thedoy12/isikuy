import { describe, expect, it } from "vitest";
import { mapStatus } from "./callback";

describe("Flowix callback status mapping", () => {
  it("maps paid-like statuses to paid success", () => {
    expect(mapStatus("settlement")).toMatchObject({
      status: "success",
      paymentStatus: "paid",
      paid: true,
      completed: true,
    });
  });

  it("maps expired-like statuses to cancelled and expired", () => {
    expect(mapStatus("expired")).toMatchObject({
      status: "cancelled",
      paymentStatus: "expired",
      paid: false,
    });
  });

  it("keeps unknown statuses pending and unpaid", () => {
    expect(mapStatus("waiting")).toMatchObject({
      status: "pending",
      paymentStatus: "unpaid",
      paid: false,
    });
  });
});
