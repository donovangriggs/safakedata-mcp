import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

async function connect(fetch: typeof globalThis.fetch, apiKey: string | undefined) {
  const server = createServer({ apiKey, fetch, version: "0.0.0-test" });
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const fetchOk = () =>
  vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify({ data: [{ name: "Ndalo Technologies (Pty) Ltd" }], meta: { count: 1 } }), {
        headers: { "X-RateLimit-Remaining": "12" },
      }),
  );

describe("MCP server", () => {
  it("lists one tool per endpoint", async () => {
    const client = await connect(fetchOk(), "safk_test");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "generate_address",
      "generate_bank_account",
      "generate_company",
      "generate_person",
      "generate_sa_id",
    ]);
    for (const t of tools) expect(Object.keys(t.inputSchema.properties ?? {})).toEqual(["count", "seed"]);
  });

  it("calls the matching endpoint and returns the data as JSON", async () => {
    const fetch = fetchOk();
    const client = await connect(fetch, "safk_test");
    const res = await client.callTool({ name: "generate_company", arguments: { count: 2, seed: 7 } });

    expect(String(fetch.mock.calls[0]![0])).toBe("https://www.safakedata.dev/api/v1/company?count=2&seed=7");
    expect(res.isError).toBeFalsy();
    const [data, quota] = res.content as { text: string }[];
    expect(JSON.parse(data!.text)).toEqual([{ name: "Ndalo Technologies (Pty) Ltd" }]);
    expect(quota!.text).toBe("Requests left this month: 12");
  });

  it("rejects out-of-range input before calling the API", async () => {
    const fetch = fetchOk();
    const client = await connect(fetch, "safk_test");
    const res = await client.callTool({ name: "generate_person", arguments: { count: 101 } });
    expect(res.isError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns API errors as tool errors", async () => {
    const client = await connect(fetchOk(), undefined);
    const res = await client.callTool({ name: "generate_sa_id", arguments: {} });
    expect(res.isError).toBe(true);
    expect((res.content as { text: string }[])[0]!.text).toContain("Get a free key");
  });
});
