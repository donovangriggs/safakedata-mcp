#!/usr/bin/env node
import { createRequire } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const server = createServer({ apiKey: process.env.SAFAKEDATA_API_KEY?.trim(), version });
await server.connect(new StdioServerTransport());

if (!process.env.SAFAKEDATA_API_KEY) {
  console.error("safakedata-mcp: SAFAKEDATA_API_KEY is not set; tool calls will fail until it is.");
}
