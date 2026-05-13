import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http";

describe("HttpClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends query params and parses JSON responses", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpClient("https://example.test");
    const result = await client.get<{ ok: boolean }>("/status", { page: 2 });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/status?page=2",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
