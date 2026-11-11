import { describe, expect, it } from "vitest";
import { PaypalError, type PaypalClient } from "./paypal-client.js";
import { makePayments } from "./service.js";

// Records each PayPal call and answers with canned data. The real client is covered by
// paypal-client.test.ts; here we check what service.ts asks PayPal for and what it returns.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double: bodies are inspected loosely
type Call = { method: string; path: string; body?: any; requestId?: string };
function fakeClient(reply: unknown | ((call: Call) => unknown)) {
  const calls: Call[] = [];
  const client = {
    getAccessToken: async () => "tok",
    request: async (method: string, path: string, options: { body?: unknown; requestId?: string } = {}) => {
      const call = { method, path, body: options.body, requestId: options.requestId };
      calls.push(call);
      const value = typeof reply === "function" ? (reply as (c: Call) => unknown)(call) : reply;
      if (value instanceof Error) throw value;
      return value;
    },
  } as unknown as PaypalClient;
  return { client, calls };
}

const cfg = { currency: "USD", webOrigin: "https://web.example.com" };
const noEmail = async () => null;
const approvalLinks = [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORD-1" }];

describe("createOrder (donation)", () => {
  it("creates a CAPTURE order for the gamer with return and cancel URLs", async () => {
    const { client, calls } = fakeClient({ id: "ORD-1", links: approvalLinks });
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });

    const result = await pay.createOrder({ amountCents: 1250, gamerId: "gamer-1", requestId: "donation:d1" });

    expect(result).toEqual({
      orderId: "ORD-1",
      approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORD-1",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].path).toBe("/v2/checkout/orders");
    expect(calls[0].requestId).toBe("donation:d1");
    expect(calls[0].body.intent).toBe("CAPTURE");
    expect(calls[0].body.purchase_units).toEqual([
      { custom_id: "donation:gamer-1", amount: { currency_code: "USD", value: "12.50" } },
    ]);
    expect(calls[0].body.payment_source.paypal.experience_context).toMatchObject({
      return_url: "https://web.example.com/pay/return",
      cancel_url: "https://web.example.com/pay/return?cancelled=1",
    });
  });

  it("rejects a non-integer amount before calling PayPal", async () => {
    const { client, calls } = fakeClient({});
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });
    await expect(pay.createOrder({ amountCents: 12.5, gamerId: "g", requestId: "r" })).rejects.toThrow(/integer/);
    expect(calls).toHaveLength(0);
  });
});

describe("captureDonationOrder", () => {
  it("captures the order and returns the capture id and amount in cents", async () => {
    const { client, calls } = fakeClient({
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{ id: "CAP-1", amount: { value: "12.50" } }] } }],
    });
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });

    expect(await pay.captureDonationOrder("ORD-1")).toEqual({ captureId: "CAP-1", amountCents: 1250 });
    expect(calls[0].path).toBe("/v2/checkout/orders/ORD-1/capture");
    expect(calls[0].requestId).toBe("donation-capture:ORD-1");
  });

  it("fails with PAYPAL_ERROR when PayPal returns no capture", async () => {
    const { client } = fakeClient({ status: "PAYER_ACTION_REQUIRED", purchase_units: [{}] });
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });
    await expect(pay.captureDonationOrder("ORD-1")).rejects.toBeInstanceOf(PaypalError);
  });
});

describe("bounty escrow", () => {
  it("authorizeOrder creates an AUTHORIZE order tagged with the bounty", async () => {
    const { client, calls } = fakeClient({ id: "ORD-2", links: approvalLinks });
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });

    const result = await pay.authorizeOrder({ amountCents: 5000, bountyId: "b-1", requestId: "bounty:b-1" });

    expect(result.orderId).toBe("ORD-2");
    expect(calls[0].body.intent).toBe("AUTHORIZE");
    expect(calls[0].body.purchase_units[0]).toEqual({
      custom_id: "bounty:b-1",
      amount: { currency_code: "USD", value: "50.00" },
    });
    expect(calls[0].requestId).toBe("bounty:b-1");
  });

  it("completeAuthorization returns the authorization id and expiry", async () => {
    const { client, calls } = fakeClient({
      purchase_units: [
        { payments: { authorizations: [{ id: "AUTH-1", expiration_time: "2026-12-09T10:00:00Z" }] } },
      ],
    });
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });

    expect(await pay.completeAuthorization("ORD-2")).toEqual({
      authorizationId: "AUTH-1",
      expiresAt: "2026-12-09T10:00:00Z",
    });
    expect(calls[0].path).toBe("/v2/checkout/orders/ORD-2/authorize");
    expect(calls[0].requestId).toBe("bounty-authorize:ORD-2");
  });

  it("captureOrder captures the authorization as a final capture by default", async () => {
    const { client, calls } = fakeClient({ id: "CAP-9", status: "COMPLETED" });
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });

    expect(await pay.captureOrder("AUTH-1")).toEqual({ captureId: "CAP-9" });
    expect(calls[0].path).toBe("/v2/payments/authorizations/AUTH-1/capture");
    expect(calls[0].body).toEqual({ final_capture: true });
    expect(calls[0].requestId).toBe("bounty-capture:AUTH-1");
  });

  it("captureOrder honours a caller request id and finalCapture: false", async () => {
    const { client, calls } = fakeClient({ id: "CAP-9" });
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });
    await pay.captureOrder("AUTH-1", { requestId: "mine", finalCapture: false });
    expect(calls[0].requestId).toBe("mine");
    expect(calls[0].body).toEqual({ final_capture: false });
  });

  it("voidAuthorization voids the authorization", async () => {
    const { client, calls } = fakeClient(undefined);
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });
    await expect(pay.voidAuthorization("AUTH-1")).resolves.toBeUndefined();
    expect(calls[0].path).toBe("/v2/payments/authorizations/AUTH-1/void");
    expect(calls[0].method).toBe("POST");
  });

  it("voidAuthorization treats an already-voided authorization as success", async () => {
    const { client } = fakeClient(new PaypalError("failed", 422, "dbg", ["AUTHORIZATION_VOIDED"]));
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });
    await expect(pay.voidAuthorization("AUTH-1")).resolves.toBeUndefined();
  });

  it("voidAuthorization still fails on any other PayPal error", async () => {
    const { client } = fakeClient(new PaypalError("failed", 422, "dbg", ["AUTHORIZATION_ALREADY_CAPTURED"]));
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });
    await expect(pay.voidAuthorization("AUTH-1")).rejects.toBeInstanceOf(PaypalError);
  });
});

describe("payout", () => {
  it("pays the user's PayPal email, deduped by the wallet entry id", async () => {
    const { client, calls } = fakeClient({ batch_header: { payout_batch_id: "BATCH-1" } });
    const pay = makePayments(client, cfg, { getPaypalEmail: async (id) => (id === "u-1" ? "gamer@example.com" : null) });

    const result = await pay.payout({ userId: "u-1", amountCents: 2500, walletEntryId: "we-1" });

    expect(result).toEqual({ payoutBatchId: "BATCH-1" });
    expect(calls[0].path).toBe("/v1/payments/payouts");
    expect(calls[0].requestId).toBe("payout:we-1");
    expect(calls[0].body.sender_batch_header.sender_batch_id).toBe("we-1");
    expect(calls[0].body.items).toEqual([
      {
        recipient_type: "EMAIL",
        receiver: "gamer@example.com",
        amount: { currency: "USD", value: "25.00" },
        sender_item_id: "we-1",
      },
    ]);
  });

  it("refuses to pay a user with no PayPal email, without calling PayPal", async () => {
    const { client, calls } = fakeClient({});
    const pay = makePayments(client, cfg, { getPaypalEmail: noEmail });
    await expect(pay.payout({ userId: "u-2", amountCents: 2500, walletEntryId: "we-2" })).rejects.toMatchObject({
      status: 422,
    });
    expect(calls).toHaveLength(0);
  });
});
