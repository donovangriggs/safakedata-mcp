import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchData, type ClientOptions, type Endpoint } from "./client.js";

const TOOLS: { name: string; endpoint: Endpoint; title: string; description: string }[] = [
  {
    name: "generate_person",
    endpoint: "person",
    title: "Generate SA people",
    description:
      "Generate fake South African people: first and last name, email, phone, gender, date of birth, a valid SA ID number and a home address.",
  },
  {
    name: "generate_sa_id",
    endpoint: "id",
    title: "Generate SA ID numbers",
    description:
      "Generate valid 13-digit South African ID numbers (correct Luhn check digit) with the date of birth, gender and citizenship they encode.",
  },
  {
    name: "generate_bank_account",
    endpoint: "bank",
    title: "Generate SA bank accounts",
    description:
      "Generate fake South African bank account details: bank name, account number, universal branch code and account type.",
  },
  {
    name: "generate_address",
    endpoint: "address",
    title: "Generate SA addresses",
    description:
      "Generate South African street addresses across all 9 provinces: street, suburb, city, province and postal code.",
  },
  {
    name: "generate_company",
    endpoint: "company",
    title: "Generate SA companies",
    description:
      "Generate fake South African companies: name, CIPC-style registration number, VAT number, industry and company type.",
  },
];

const inputSchema = {
  count: z.number().int().min(1).max(100).optional().describe("How many records to generate, 1 to 100. Defaults to 1."),
  seed: z
    .number()
    .int()
    .min(0)
    .max(2147483647)
    .optional()
    .describe("Any integer from 0 to 2147483647. The same seed always returns the same data."),
};

export function createServer(opts: ClientOptions & { version: string }): McpServer {
  const server = new McpServer({ name: "safakedata", version: opts.version });
  const userAgent = `safakedata-mcp/${opts.version}`;

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: `${tool.description} Test data only, never real people or accounts.`,
        inputSchema,
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      async (params) => {
        try {
          const result = await fetchData(tool.endpoint, params, { userAgent, ...opts });
          const content = [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }];
          if (result.remaining !== undefined) {
            content.push({ type: "text", text: `Requests left this month: ${result.remaining}` });
          }
          return { content };
        } catch (err) {
          return { isError: true, content: [{ type: "text", text: (err as Error).message }] };
        }
      },
    );
  }
  return server;
}
