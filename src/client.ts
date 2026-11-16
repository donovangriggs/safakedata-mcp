export const BASE_URL = "https://www.safakedata.dev";
export const SIGNUP_URL = `${BASE_URL}/register`;

export type Endpoint = "person" | "id" | "bank" | "address" | "company";

export interface Params {
  count?: number;
  seed?: number;
}

export interface Result {
  data: unknown[];
  meta: { count: number; endpoint: string; seed: number | null };
  /** Requests left this month, from X-RateLimit-Remaining. */
  remaining?: number;
}

export interface ClientOptions {
  apiKey?: string;
  fetch?: typeof fetch;
  userAgent?: string;
}

export class SafakedataError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "SafakedataError";
  }
}

const KEY_HELP = `Set SAFAKEDATA_API_KEY to a key from your dashboard. Get a free key at ${SIGNUP_URL}.`;

export async function fetchData(endpoint: Endpoint, params: Params, opts: ClientOptions): Promise<Result> {
  if (!opts.apiKey) throw new SafakedataError(`No API key configured. ${KEY_HELP}`, undefined, "MISSING_API_KEY");

  const url = new URL(`/api/v1/${endpoint}`, BASE_URL);
  if (params.count !== undefined) url.searchParams.set("count", String(params.count));
  if (params.seed !== undefined) url.searchParams.set("seed", String(params.seed));

  let res: Response;
  try {
    res = await (opts.fetch ?? fetch)(url, {
      headers: {
        "x-api-key": opts.apiKey,
        accept: "application/json",
        ...(opts.userAgent && { "user-agent": opts.userAgent }),
      },
    });
  } catch (err) {
    throw new SafakedataError(`Could not reach ${BASE_URL}: ${(err as Error).message}`);
  }

  const body = (await res.json().catch(() => null)) as
    | (Result & { error?: { code?: string; message?: string } })
    | null;

  if (!res.ok) throw toError(res, body?.error);
  if (!body || !Array.isArray(body.data)) {
    throw new SafakedataError(`Unexpected response from ${url.pathname} (HTTP ${res.status}).`, res.status);
  }

  const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? NaN);
  return { data: body.data, meta: body.meta, ...(Number.isFinite(remaining) && { remaining }) };
}

function toError(res: Response, err?: { code?: string; message?: string }): SafakedataError {
  const code = err?.code;
  const apiMessage = err?.message ?? `HTTP ${res.status}`;
  let message: string;
  switch (code) {
    case "MISSING_API_KEY":
    case "INVALID_API_KEY":
    case "KEY_REVOKED":
      message = `The API key was rejected (${apiMessage}). ${KEY_HELP}`;
      break;
    case "EMAIL_NOT_VERIFIED":
      message = `Your safakedata.dev email address is not verified yet. Click the link in the verification email, then try again.`;
      break;
    case "ACCOUNT_INACTIVE":
      message = `Your safakedata.dev account is inactive (${apiMessage}).`;
      break;
    case "RATE_LIMIT_EXCEEDED": {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      const when = Number.isFinite(reset) && reset > 0 ? ` It resets at ${new Date(reset * 1000).toISOString()}.` : "";
      message = `Monthly request limit reached.${when}`;
      break;
    }
    case "BURST_LIMIT_EXCEEDED":
      message = `Too many requests in a short time. Wait a minute and try again.`;
      break;
    default:
      message = `safakedata.dev API error: ${apiMessage}`;
  }
  return new SafakedataError(message, res.status, code);
}
