# safakedata-mcp

[![CI](https://github.com/donovangriggs/safakedata-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/donovangriggs/safakedata-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/safakedata-mcp)](https://www.npmjs.com/package/safakedata-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An [MCP](https://modelcontextprotocol.io) server that gives Claude, Cursor and other AI tools realistic South African test data: people, SA ID numbers, bank accounts, addresses and companies.

It is a small client for the [SA Fake Data](https://www.safakedata.dev) API. Ask your assistant for "ten test customers" or "a few valid SA ID numbers" while you write seed scripts, fixtures or form tests, and it calls the API for you.

All data is generated. ID numbers pass the Luhn check and registration and VAT numbers use the real formats, but none of it belongs to a real person, account or business.

## Get a free API key

1. Sign up at [safakedata.dev/register](https://www.safakedata.dev/register) and verify your email.
2. Create a key on the [API keys](https://www.safakedata.dev/keys) page. It starts with `safk_`.

The free plan includes 500 requests a month. Each tool call is one request, whatever the `count`.

## Install

The server runs over stdio with `npx` and reads the key from `SAFAKEDATA_API_KEY`. Node.js 22 or newer.

### Claude Code

```sh
claude mcp add safakedata -e SAFAKEDATA_API_KEY=safk_your_key -- npx -y safakedata-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json` (Settings → Developer → Edit Config) and restart Claude Desktop:

```json
{
  "mcpServers": {
    "safakedata": {
      "command": "npx",
      "args": ["-y", "safakedata-mcp"],
      "env": { "SAFAKEDATA_API_KEY": "safk_your_key" }
    }
  }
}
```

### Cursor

Add this to `~/.cursor/mcp.json`, or `.cursor/mcp.json` in a project:

```json
{
  "mcpServers": {
    "safakedata": {
      "command": "npx",
      "args": ["-y", "safakedata-mcp"],
      "env": { "SAFAKEDATA_API_KEY": "safk_your_key" }
    }
  }
}
```

Any other MCP client that can launch a stdio server works the same way.

## Tools

Every tool takes the same two optional inputs:

| Input   | Type    | Notes                                                        |
| ------- | ------- | ------------------------------------------------------------ |
| `count` | integer | 1 to 100 records. Default 1.                                 |
| `seed`  | integer | 0 to 2147483647. The same seed always returns the same data. |

| Tool                    | Returns                                                                        | Example prompt                                            |
| ----------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `generate_person`       | Name, email, phone, gender, date of birth, SA ID number and home address       | "Make 10 test users and write them to `seed/users.json`." |
| `generate_sa_id`        | 13-digit SA ID number with the date of birth, gender and citizenship it encodes | "Give me 3 valid SA ID numbers for my validator tests."   |
| `generate_bank_account` | Bank name, account number, branch code and account type                        | "I need a fake bank account to fill in the debit order form." |
| `generate_address`      | Street, suburb, city, province and postal code                                 | "Generate 20 addresses to test the province dropdown."    |
| `generate_company`      | Company name, CIPC registration number, VAT number, industry and type          | "Create a few suppliers with VAT numbers for the invoice fixtures." |

### Sample output

`generate_sa_id` with `{ "count": 2, "seed": 42 }`:

```json
[
  {
    "idNumber": "9709052632087",
    "dateOfBirth": "1997-09-05",
    "gender": "female",
    "citizenship": "citizen"
  },
  {
    "idNumber": "9806079410081",
    "dateOfBirth": "1998-06-07",
    "gender": "male",
    "citizenship": "citizen"
  }
]
```

`generate_company` with `{ "seed": 7 }`:

```json
[
  {
    "name": "Africa Solutions Inc",
    "registrationNumber": "2008/464969/11",
    "vatNumber": "4315932667",
    "industry": "Transport",
    "type": "Inc"
  }
]
```

Each result also reports how many requests you have left this month.

### Errors

Problems come back as tool errors your assistant can read and explain:

- no key, or an invalid or revoked key: how to set `SAFAKEDATA_API_KEY` and where to get a key
- email not verified: verify it from the email safakedata.dev sent you
- monthly limit reached: when the quota resets
- too many requests in a short burst: wait a minute and retry

## Development

```sh
git clone https://github.com/donovangriggs/safakedata-mcp.git
cd safakedata-mcp
npm install
npm test          # unit tests with a mocked fetch
npm run lint
npm run typecheck
npm run build     # compiles to dist/
```

`test/live.test.ts` calls the real API and is skipped unless `SAFAKEDATA_API_KEY` is set:

```sh
SAFAKEDATA_API_KEY=safk_your_key npm test
```

To try a local build in Claude Code: `claude mcp add safakedata-dev -e SAFAKEDATA_API_KEY=safk_your_key -- node /path/to/safakedata-mcp/dist/index.js`.

### Releases

CI runs lint, typecheck, tests and build on every push and pull request, on Node 22, 24 and 26.

Pushing a `v*` tag that matches the `package.json` version runs `.github/workflows/release.yml`, which publishes to npm with provenance. It needs an `NPM_TOKEN` repository secret holding an npm automation token with publish rights to `safakedata-mcp`.

## Related

- [safakedata.dev](https://www.safakedata.dev): the API this server calls, with docs and a playground
- [kal](https://github.com/donovangriggs/kal): AI helpers for Claude Code that each work in their own copy of the code, with a human gate

## License

[MIT](LICENSE)
