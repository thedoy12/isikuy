import { describe, expect, it } from "vitest";
import { priceWithMarkup } from "./pricing";

describe("priceWithMarkup", () => {
  it("keeps tiny products close to the intended margin", () => {
    expect(priceWithMarkup(947)).toBe(975);
    expect(priceWithMarkup(1_750)).toBe(1_800);
  });

  it("uses softer percentage for medium and high priced products", () => {
    expect(priceWithMarkup(10_000)).toBe(10_200);
    expect(priceWithMarkup(75_000)).toBe(76_200);
    expect(priceWithMarkup(100_000)).toBe(101_300);
    expect(priceWithMarkup(250_000)).toBe(252_500);
  });

  it("still honors explicit markup overrides", () => {
    expect(priceWithMarkup(10_000, 3)).toBe(10_300);
  });
});
