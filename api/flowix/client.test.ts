import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/commerceSettings", () => ({
  getCommerceSettings: vi.fn(),
}));

import { isActiveFlowixProduct } from "./client";

describe("Flowix product availability", () => {
  it("keeps available Flowix products selectable", () => {
    expect(
      isActiveFlowixProduct({
        code: "ML5",
        name: "5 Diamonds",
        brand: "Mobile Legends",
        status: "aktif",
        price: 1500,
      }),
    ).toBe(true);
  });

  it("treats inactive or empty products as unavailable", () => {
    expect(
      isActiveFlowixProduct({
        code: "ML5",
        name: "5 Diamonds",
        brand: "Mobile Legends",
        status: "aktif",
        raw_status: "empty",
        price: 1500,
      }),
    ).toBe(false);

    expect(
      isActiveFlowixProduct({
        code: "ML5",
        name: "5 Diamonds",
        brand: "Mobile Legends",
        status: "aktif",
        stock: 0,
        price: 1500,
      }),
    ).toBe(false);
  });
});
