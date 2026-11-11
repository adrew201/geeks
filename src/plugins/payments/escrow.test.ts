import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeOrder, captureOrder, completeAuthorization, PaypalError, voidAuthorization } from "./service.js";

// Bounty escrow against a stubbed PayPal. The answers below are the sandbox answers recorded in
// docs/escrow-sandbox-test.md (Gicharu, 11 Nov), so these tests pin the behaviour we verified.

type Call = { url: string; method: string; body: Record<string, unknown> | null; headers: Record<string, string> };
let calls: Call[];
let reply: (url: string, method: string) => { status: number; body: unknown };

function stubPayPal() {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/v1/oauth2/token")) {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      }
      const method = init.method ?? "GET";
      calls.push({
        url,
        method,
        body: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
        headers: init.headers as Record<string, string>,
      });
      const { status, body } = reply(url, method);
      return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    }),
  );
}

const paypalError = (status: number, issue: string) => ({ status, body: { details: [{ issue }], debug_id: "dbg" } });

beforeEach(() => {
  process.env.PAYPAL_CLIENT_ID = "id";
  process.env.PAYPAL_CLIENT_SECRET = "secret";
  process.env.PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";
  process.env.WEB_ORIGIN = "http://localhost:5173";
  stubPayPal();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authorizeOrder (bounty hold, step 1)", () => {
  it("creates an AUTHORIZE order with a bounty custom_id, formats cents, and returns the approval link", async () => {
    reply = () => ({
      status: 201,
      body: {
        id: "ORDER-1",
        links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1" }],
      },
    });
    const res = await authorizeOrder({ amountCents: 1000, bountyId: "b-1", requestId: "bounty-order-b-1" });
    expect(res).toEqual({ orderId: "ORDER-1", approvalUrl: expect.stringContaining("paypal.com") });
    const sent = calls[0];
    expect(sent.url).toContain("/v2/checkout/orders");
    expect(sent.body).toMatchObject({
      intent: "AUTHORIZE",
      purchase_units: [{ custom_id: "bounty:b-1", amount: { value: "10.00", currency_code: "USD" } }],
      payment_source: { paypal: { experience_context: { user_action: "CONTINUE" } } },
    });
    expect(sent.headers["PayPal-Request-Id"]).toBe("bounty-order-b-1");
  });
});

describe("completeAuthorization (step 2)", () => {
  it("places the hold and returns the authorization id and its expiry", async () => {
    reply = () => ({
      status: 201,
      body: {
        id: "ORDER-1",
        purchase_units: [
          { payments: { authorizations: [{ id: "AUTH-1", status: "CREATED", expiration_time: "2026-12-10T00:00:00Z" }] } },
        ],
      },
    });
    const res = await completeAuthorization("ORDER-1", "auth-ORDER-1");
    expect(res).toEqual({ authorizationId: "AUTH-1", expiresAt: "2026-12-10T00:00:00Z" });
    expect(calls[0].url).toContain("/v2/checkout/orders/ORDER-1/authorize");
    expect(calls[0].headers["PayPal-Request-Id"]).toBe("auth-ORDER-1");
  });

  it("throws when PayPal's answer has no authorization", async () => {
    reply = () => ({ status: 201, body: { id: "ORDER-1", purchase_units: [{}] } });
    await expect(completeAuthorization("ORDER-1", "x")).rejects.toThrow(/no authorization/);
  });
});

describe("captureOrder (take the money, step 3)", () => {
  it("captures with final_capture true and returns the capture id", async () => {
    reply = () => ({ status: 201, body: { id: "CAP-1", status: "COMPLETED" } });
    const res = await captureOrder("AUTH-1", { requestId: "bounty-capture-b-1" });
    expect(res).toEqual({ captureId: "CAP-1", alreadyCaptured: false });
    expect(calls[0].url).toContain("/v2/payments/authorizations/AUTH-1/capture");
    expect(calls[0].body).toEqual({ final_capture: true });
    expect(calls[0].headers["PayPal-Request-Id"]).toBe("bounty-capture-b-1");
  });

  it("a second capture of the same hold is 'already done' with no new captureId (AUTHORIZATION_ALREADY_CAPTURED)", async () => {
    reply = () => paypalError(422, "AUTHORIZATION_ALREADY_CAPTURED");
    const res = await captureOrder("AUTH-1", { requestId: "bounty-capture-b-1-retry" });
    expect(res).toEqual({ captureId: null, alreadyCaptured: true });
  });

  it("refuses to capture a voided hold (AUTHORIZATION_VOIDED is a real error)", async () => {
    reply = () => paypalError(422, "AUTHORIZATION_VOIDED");
    await expect(captureOrder("AUTH-1", { requestId: "x" })).rejects.toBeInstanceOf(PaypalError);
  });
});

describe("voidAuthorization (release the hold)", () => {
  it("voids the hold", async () => {
    reply = () => ({ status: 200, body: { id: "AUTH-1", status: "VOIDED" } });
    await expect(voidAuthorization("AUTH-1")).resolves.toBeUndefined();
    expect(calls[0].url).toContain("/v2/payments/authorizations/AUTH-1/void");
  });

  it("voiding an already-voided hold (PREVIOUSLY_VOIDED) counts as success", async () => {
    reply = () => paypalError(422, "PREVIOUSLY_VOIDED");
    await expect(voidAuthorization("AUTH-1")).resolves.toBeUndefined();
  });

  it("any other PayPal error still throws", async () => {
    reply = () => paypalError(500, "INTERNAL_SERVER_ERROR");
    await expect(voidAuthorization("AUTH-1")).rejects.toBeInstanceOf(PaypalError);
  });
});
