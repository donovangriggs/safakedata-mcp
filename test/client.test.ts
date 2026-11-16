import { describe, expect, it, vi } from "vitest";
import { fetchData, SafakedataError } from "../src/client.js";

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn<typeof fetch>(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers }),
  );
}

const ok = { data: [{ idNumber: "9203145081082" }], meta: { count: 1, endpoint: "/api/v1/id", seed: 42 } };

async function rejection(p: Promise<unknown>): Promise<SafakedataError> {
  const err = await p.then(() => undefined, (e: unknown) => e);
  expect(err).toBeInstanceOf(SafakedataError);
  return err as SafakedataError;
}

describe("fetchData", () => {
  it("calls the endpoint with the key header and query params", async () => {
    const fetch = mockFetch(200, ok, { "X-RateLimit-Remaining": "499" });
    const result = await fetchData("id", { count: 3, seed: 42 }, { apiKey: "safk_test", fetch, userAgent: "ua/1" });

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://www.safakedata.dev/api/v1/id?count=3&seed=42");
    expect(init?.headers).toMatchObject({ "x-api-key": "safk_test", "user-agent": "ua/1" });
    expect(result).toEqual({ ...ok, remaining: 499 });
  });

  it("omits params that are not set", async () => {
    const fetch = mockFetch(200, ok);
    const result = await fetchData("person", {}, { apiKey: "k", fetch });
    expect(String(fetch.mock.calls[0]![0])).toBe("https://www.safakedata.dev/api/v1/person");
    expect(result.remaining).toBeUndefined();
  });

  it("fails without calling the API when no key is set", async () => {
    const fetch = mockFetch(200, ok);
    const err = await rejection(fetchData("id", {}, { fetch }));
    expect(err.code).toBe("MISSING_API_KEY");
    expect(err.message).toContain("SAFAKEDATA_API_KEY");
    expect(err.message).toContain("https://www.safakedata.dev/register");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, "INVALID_API_KEY", "rejected"],
    [401, "KEY_REVOKED", "rejected"],
    [403, "EMAIL_NOT_VERIFIED", "not verified"],
    [403, "ACCOUNT_INACTIVE", "inactive"],
    [429, "BURST_LIMIT_EXCEEDED", "Wait a minute"],
    [400, "INVALID_PARAMETER", "count must be <= 100"],
    [500, "INTERNAL_ERROR", "count must be <= 100"],
  ])("maps HTTP %i %s to a helpful message", async (status, code, text) => {
    const fetch = mockFetch(status, { error: { type: "x", code, message: "count must be <= 100" } });
    const err = await rejection(fetchData("bank", {}, { apiKey: "k", fetch }));
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toContain(text);
  });

  it("reports when the monthly limit resets", async () => {
    const fetch = mockFetch(
      429,
      { error: { type: "rate_limit_error", code: "RATE_LIMIT_EXCEEDED", message: "quota" } },
      { "X-RateLimit-Reset": "1767225600" },
    );
    const err = await rejection(fetchData("company", {}, { apiKey: "k", fetch }));
    expect(err.message).toBe("Monthly request limit reached. It resets at 2026-01-01T00:00:00.000Z.");
  });

  it("handles non-JSON error bodies", async () => {
    const err = await rejection(fetchData("address", {}, { apiKey: "k", fetch: mockFetch(502, "Bad Gateway") }));
    expect(err.message).toBe("safakedata.dev API error: HTTP 502");
  });

  it("rejects a 200 without a data array", async () => {
    const err = await rejection(fetchData("address", {}, { apiKey: "k", fetch: mockFetch(200, { hello: 1 }) }));
    expect(err.message).toContain("Unexpected response");
  });

  it("wraps network failures", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const err = await rejection(fetchData("id", {}, { apiKey: "k", fetch }));
    expect(err.message).toBe("Could not reach https://www.safakedata.dev: fetch failed");
  });
});
