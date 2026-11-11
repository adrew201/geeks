import { AppError } from "../../lib/errors.js";

// Low-level PayPal REST client: access token, JSON requests, error mapping.
// service.ts is the only caller. Nothing here logs payer data or tokens.

/** Any PayPal failure, shown to API clients as 502 PAYPAL_ERROR (README section 14). */
export class PaypalError extends AppError {
  constructor(
    message: string,
    public upstreamStatus: number | null = null,
    public debugId: string | null = null,
    public issues: string[] = [],
  ) {
    super(502, "PAYPAL_ERROR", message);
  }
}

export type PaypalConfig = { clientId: string; clientSecret: string; apiBase: string };
type Deps = { fetch?: typeof fetch; now?: () => number };
type RequestOptions = { body?: unknown; requestId?: string };
type Link = { rel: string; href: string };

/** Integer cents to the string PayPal expects: 1250 -> "12.50". */
export function centsToAmount(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new RangeError("Amount must be a positive integer number of cents");
  }
  return (cents / 100).toFixed(2);
}

/** Where to send the payer. `payer-action` is current; `approve` is the older name. */
export function approvalUrlFrom(links: Link[] | undefined): string {
  const link =
    links?.find((l) => l.rel === "payer-action") ?? links?.find((l) => l.rel === "approve");
  if (!link) throw new PaypalError("PayPal did not return an approval link");
  return link.href;
}

const TOKEN_SAFETY_MS = 60_000;

export function createPaypalClient(config: PaypalConfig, deps: Deps = {}) {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  let cached: { value: string; expiresAt: number } | null = null;

  async function send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(url, init);
    } catch {
      throw new PaypalError("Could not reach PayPal");
    }
  }

  async function failure(res: Response): Promise<PaypalError> {
    const data = (await res.json().catch(() => null)) as {
      name?: string;
      details?: { issue?: string }[];
    } | null;
    const issues = (data?.details ?? []).flatMap((d) => (d.issue ? [d.issue] : []));
    const reason = data?.name ? `: ${data.name}` : "";
    return new PaypalError(
      `PayPal request failed (HTTP ${res.status}${reason})`,
      res.status,
      res.headers.get("paypal-debug-id"),
      issues,
    );
  }

  async function getAccessToken(): Promise<string> {
    if (cached && now() < cached.expiresAt) return cached.value;
    const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const res = await send(`${config.apiBase}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw await failure(res);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    cached = { value: data.access_token, expiresAt: now() + data.expires_in * 1000 - TOKEN_SAFETY_MS };
    return cached.value;
  }

  async function request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {},
    retried = false,
  ): Promise<T | undefined> {
    const headers: Record<string, string> = { Authorization: `Bearer ${await getAccessToken()}` };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.requestId) headers["PayPal-Request-Id"] = options.requestId;

    const res = await send(`${config.apiBase}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (res.status === 401 && !retried) {
      cached = null; // the token was rejected: get a fresh one, once
      return request<T>(method, path, options, true);
    }
    if (!res.ok) throw await failure(res);

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : undefined;
  }

  return { getAccessToken, request };
}

export type PaypalClient = ReturnType<typeof createPaypalClient>;
