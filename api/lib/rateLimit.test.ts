import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows requests under the configured limit", () => {
    expect(() => {
      checkRateLimit({ key: "login:test", limit: 2, windowMs: 60_000 });
      checkRateLimit({ key: "login:test", limit: 2, windowMs: 60_000 });
    }).not.toThrow();
  });

  it("blocks requests over the configured limit", () => {
    checkRateLimit({ key: "checkout:test", limit: 1, windowMs: 60_000 });

    expect(() =>
      checkRateLimit({ key: "checkout:test", limit: 1, windowMs: 60_000 }),
    ).toThrow(/Terlalu banyak percobaan/);
  });
});
