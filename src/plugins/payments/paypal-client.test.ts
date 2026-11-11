import { describe, expect, it } from "vitest";
import { AppError } from "../../lib/errors.js";
import { approvalUrlFrom, centsToAmount, createPaypalClient, PaypalError } from "./paypal-client.js";

// A scripted stand-in for fetch: replies in order and records every call.
type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };
function scriptedFetch(replies: Reply[]) {
  const calls: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];
  const fetchFn = (async (url: string, init: RequestInit = {}) => {
    calls.push({
      url,
      method: init.method ?? "GET",
      headers: Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>)),
      body: init.body as string | undefined,
    });
    const reply = replies.shift();
    if (!reply) throw new Error("unexpected extra fetch call");
    const status = reply.status ?? 200;
    const text = reply.body === undefined ? "" : JSON.stringify(reply.body);
    return new Response(status === 204 ? null : text, { status, headers: reply.headers });
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

const token = (value = "tok-1", expires_in = 3600): Reply => ({ body: { access_token: value, expires_in } });
const config = { clientId: "id", clientSecret: "secret", apiBase: "https://api-m.sandbox.paypal.com" };

describe("centsToAmount", () => {
  it("formats integer cents as a two-decimal string", () => {
    expect(centsToAmount(1250)).toBe("12.50");
    expect(centsToAmount(5)).toBe("0.05");
    expect(centsToAmount(100)).toBe("1.00");
  });

  it("rejects floats, negatives, zero and non-numbers", () => {
    for (const bad of [12.5, -100, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => centsToAmount(bad)).toThrow(/integer/);
    }
  });
});

describe("approvalUrlFrom", () => {
  it("prefers the payer-action link", () => {
    const links = [
      { rel: "self", href: "https://x/self" },
      { rel: "approve", href: "https://x/approve" },
      { rel: "payer-action", href: "https://x/payer" },
    ];
    expect(approvalUrlFrom(links)).toBe("https://x/payer");
  });

  it("falls back to the approve link", () => {
    expect(approvalUrlFrom([{ rel: "approve", href: "https://x/approve" }])).toBe("https://x/approve");
  });

  it("throws a PAYPAL_ERROR when there is no approval link", () => {
    expect(() => approvalUrlFrom([{ rel: "self", href: "https://x/self" }])).toThrow(PaypalError);
    expect(() => approvalUrlFrom(undefined)).toThrow(/approval link/);
  });
});

describe("getAccessToken", () => {
  it("requests a token with basic auth and client_credentials", async () => {
    const { fetchFn, calls } = scriptedFetch([token()]);
    const client = createPaypalClient(config, { fetch: fetchFn });

    expect(await client.getAccessToken()).toBe("tok-1");

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers.Authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
    expect(calls[0].body).toBe("grant_type=client_credentials");
  });

  it("reuses the cached token until about a minute before it expires", async () => {
    let now = 0;
    const { fetchFn, calls } = scriptedFetch([token("tok-1", 3600), token("tok-2", 3600)]);
    const client = createPaypalClient(config, { fetch: fetchFn, now: () => now });

    await client.getAccessToken();
    now = 3_000_000; // 50 minutes in: still cached
    expect(await client.getAccessToken()).toBe("tok-1");
    expect(calls).toHaveLength(1);

    now = 3_550_000; // inside the 60 s safety margin: fetch a new one
    expect(await client.getAccessToken()).toBe("tok-2");
    expect(calls).toHaveLength(2);
  });

  it("surfaces a rejected credential as PAYPAL_ERROR", async () => {
    const { fetchFn } = scriptedFetch([{ status: 401, body: { error: "invalid_client" } }]);
    const client = createPaypalClient(config, { fetch: fetchFn });
    await expect(client.getAccessToken()).rejects.toMatchObject({ status: 502, code: "PAYPAL_ERROR" });
  });
});

describe("request", () => {
  it("sends the bearer token, JSON body and PayPal-Request-Id", async () => {
    const { fetchFn, calls } = scriptedFetch([token(), { body: { id: "ORDER-1" } }]);
    const client = createPaypalClient(config, { fetch: fetchFn });

    const result = await client.request<{ id: string }>("POST", "/v2/checkout/orders", {
      body: { intent: "CAPTURE" },
      requestId: "donation:abc",
    });

    expect(result).toEqual({ id: "ORDER-1" });
    expect(calls[1].url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(calls[1].headers.Authorization).toBe("Bearer tok-1");
    expect(calls[1].headers["Content-Type"]).toBe("application/json");
    expect(calls[1].headers["PayPal-Request-Id"]).toBe("donation:abc");
    expect(JSON.parse(calls[1].body!)).toEqual({ intent: "CAPTURE" });
  });

  it("refreshes the token once on a 401 and retries", async () => {
    const { fetchFn, calls } = scriptedFetch([
      token("old"),
      { status: 401, body: { name: "AUTHENTICATION_FAILURE" } },
      token("new"),
      { body: { ok: true } },
    ]);
    const client = createPaypalClient(config, { fetch: fetchFn });

    expect(await client.request("GET", "/v2/checkout/orders/X")).toEqual({ ok: true });
    expect(calls[3].headers.Authorization).toBe("Bearer new");
    expect(calls).toHaveLength(4);
  });

  it("gives up after one refresh when PayPal keeps answering 401", async () => {
    const { fetchFn, calls } = scriptedFetch([
      token("a"),
      { status: 401, body: {} },
      token("b"),
      { status: 401, body: {} },
    ]);
    const client = createPaypalClient(config, { fetch: fetchFn });

    await expect(client.request("GET", "/v2/x")).rejects.toMatchObject({ status: 502, code: "PAYPAL_ERROR" });
    expect(calls).toHaveLength(4);
  });

  it("returns undefined for a 204 with no body", async () => {
    const { fetchFn } = scriptedFetch([token(), { status: 204 }]);
    const client = createPaypalClient(config, { fetch: fetchFn });
    expect(await client.request("POST", "/v2/payments/authorizations/A/void")).toBeUndefined();
  });

  it("maps a failed call to PaypalError with the debug id and issue names, and no payer data in the message", async () => {
    const { fetchFn } = scriptedFetch([
      token(),
      {
        status: 422,
        headers: { "paypal-debug-id": "dbg-123" },
        body: {
          name: "UNPROCESSABLE_ENTITY",
          message: "The requested action could not be performed.",
          details: [{ issue: "AUTHORIZATION_VOIDED", description: "payer jane@example.com" }],
        },
      },
    ]);
    const client = createPaypalClient(config, { fetch: fetchFn });

    const error = await client.request("POST", "/v2/payments/authorizations/A/void").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PaypalError);
    expect(error).toBeInstanceOf(AppError);
    const paypalError = error as PaypalError;
    expect(paypalError.status).toBe(502);
    expect(paypalError.code).toBe("PAYPAL_ERROR");
    expect(paypalError.upstreamStatus).toBe(422);
    expect(paypalError.debugId).toBe("dbg-123");
    expect(paypalError.issues).toEqual(["AUTHORIZATION_VOIDED"]);
    expect(paypalError.message).not.toContain("jane@example.com");
  });

  it("maps a network failure to PAYPAL_ERROR", async () => {
    const fetchFn = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const client = createPaypalClient(config, { fetch: fetchFn });
    await expect(client.getAccessToken()).rejects.toMatchObject({ status: 502, code: "PAYPAL_ERROR" });
  });
});
