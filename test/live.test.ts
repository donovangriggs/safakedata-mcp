// Calls the real API. Runs only when SAFAKEDATA_API_KEY is set; uses 5 requests of your quota.
import { describe, expect, it } from "vitest";
import { fetchData, type Endpoint } from "../src/client.js";

const apiKey = process.env.SAFAKEDATA_API_KEY;
const endpoints: Endpoint[] = ["person", "id", "bank", "address", "company"];

describe.skipIf(!apiKey)("live API", () => {
  it.each(endpoints)("GET /api/v1/%s", async (endpoint) => {
    const result = await fetchData(endpoint, { count: 2, seed: 42 }, { apiKey });
    expect(result.data).toHaveLength(2);
    expect(result.meta).toMatchObject({ count: 2, seed: 42 });
  });
});
