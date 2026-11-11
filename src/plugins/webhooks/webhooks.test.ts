import { createSign, generateKeyPairSync } from "node:crypto";
import { crc32 } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { isPaypalCertUrl, verifyPaypalSignature } from "./verify.js";
import webhooks from "./index.js";

// In-memory stand-in for the paypal_webhook_events table and the handler map.
const db = vi.hoisted(() => {
  type Row = { eventId: string; eventType: string; status: string };
  const state = { events: [] as Row[] };
  const unique = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
  const paypalWebhookEvent = {
    create: async ({ data }: { data: Row }) => {
      if (state.events.some((e) => e.eventId === data.eventId)) throw unique();
      state.events.push({ eventId: data.eventId, eventType: data.eventType, status: data.status });
      return data;
    },
    updateMany: async ({ where, data }: { where: { eventId: string; status: string }; data: { status: string } }) => {
      const rows = state.events.filter((e) => e.eventId === where.eventId && e.status === where.status);
      rows.forEach((r) => (r.status = data.status));
      return { count: rows.length };
    },
    update: async ({ where, data }: { where: { eventId: string }; data: { status: string } }) => {
      const row = state.events.find((e) => e.eventId === where.eventId)!;
      row.status = data.status;
      return row;
    },
  };
  return { state, prisma: { paypalWebhookEvent } };
});
const handlerMock = vi.hoisted(() => ({ handlers: {} as Record<string, (e: unknown) => Promise<void>> }));

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));
vi.mock("./handlers.js", () => handlerMock);

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const CERT_URL = "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test";
const WEBHOOK_ID = "WH-TEST-123";

function signedHeaders(body: string, webhookId = WEBHOOK_ID, certUrl = CERT_URL) {
  const transmissionId = "tx-1";
  const transmissionTime = "2026-11-11T10:00:00Z";
  const sig = createSign("SHA256")
    .update(`${transmissionId}|${transmissionTime}|${webhookId}|${crc32(Buffer.from(body))}`)
    .sign(privateKey, "base64");
  return {
    "content-type": "application/json",
    "paypal-transmission-id": transmissionId,
    "paypal-transmission-time": transmissionTime,
    "paypal-transmission-sig": sig,
    "paypal-cert-url": certUrl,
    "paypal-auth-algo": "SHA256withRSA",
  };
}

const getCert = async () => publicPem;

describe("verifyPaypalSignature", () => {
  const body = JSON.stringify({ id: "WH-1", event_type: "X" });

  it("accepts a valid signature", async () => {
    const ok = await verifyPaypalSignature({ headers: signedHeaders(body), rawBody: Buffer.from(body), webhookIds: [WEBHOOK_ID], getCert });
    expect(ok).toBe(true);
  });

  it("rejects a changed body", async () => {
    const ok = await verifyPaypalSignature({ headers: signedHeaders(body), rawBody: Buffer.from(body + " "), webhookIds: [WEBHOOK_ID], getCert });
    expect(ok).toBe(false);
  });

  it("rejects a different webhook id", async () => {
    const ok = await verifyPaypalSignature({ headers: signedHeaders(body, "WH-OTHER"), rawBody: Buffer.from(body), webhookIds: [WEBHOOK_ID], getCert });
    expect(ok).toBe(false);
  });

  it("rejects missing headers without fetching a cert", async () => {
    const fetcher = vi.fn(getCert);
    const headers: Record<string, string> = signedHeaders(body);
    delete headers["paypal-transmission-sig"];
    const ok = await verifyPaypalSignature({ headers, rawBody: Buffer.from(body), webhookIds: [WEBHOOK_ID], getCert: fetcher });
    expect(ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a cert url outside paypal.com without fetching it", async () => {
    const fetcher = vi.fn(getCert);
    const headers = signedHeaders(body, WEBHOOK_ID, "https://evil.example/cert.pem");
    const ok = await verifyPaypalSignature({ headers, rawBody: Buffer.from(body), webhookIds: [WEBHOOK_ID], getCert: fetcher });
    expect(ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("only allows https paypal.com cert hosts", () => {
    expect(isPaypalCertUrl("https://api.paypal.com/v1/notifications/certs/x")).toBe(true);
    expect(isPaypalCertUrl("http://api.paypal.com/x")).toBe(false);
    expect(isPaypalCertUrl("https://paypal.com.evil.example/x")).toBe(false);
    expect(isPaypalCertUrl("https://evilpaypal.com/x")).toBe(false);
    expect(isPaypalCertUrl("not a url")).toBe(false);
  });
});

describe("POST /api/v1/webhooks/paypal", () => {
  const event = { id: "WH-EVT-1", event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource_type: "subscription" };
  const body = JSON.stringify(event);

  function buildApp() {
    const app = Fastify();
    app.register(webhooks, { prefix: "/api/v1" });
    app.post("/echo", async (req) => req.body); // another route in a sibling context
    return app;
  }
  const send = (app: ReturnType<typeof buildApp>, payload: string, headers: Record<string, string>) =>
    app.inject({ method: "POST", url: "/api/v1/webhooks/paypal", payload, headers });

  beforeEach(() => {
    db.state.events = [];
    handlerMock.handlers = {};
    process.env.PAYPAL_WEBHOOK_ID = WEBHOOK_ID;
    process.env.NODE_ENV = "test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(publicPem)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("runs the handler once for a verified event and records it", async () => {
    const handler = vi.fn(async () => {});
    handlerMock.handlers[event.event_type] = handler;
    const res = await send(buildApp(), body, signedHeaders(body));
    expect(res.statusCode).toBe(200);
    expect(handler).toHaveBeenCalledWith(event);
    expect(db.state.events).toEqual([{ eventId: "WH-EVT-1", eventType: event.event_type, status: "PROCESSED" }]);
  });

  it("rejects a forged event with 400 and stores nothing", async () => {
    const handler = vi.fn(async () => {});
    handlerMock.handlers[event.event_type] = handler;
    const headers = signedHeaders(body);
    const forged = JSON.stringify({ ...event, id: "WH-EVT-2" });
    const res = await send(buildApp(), forged, headers);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_SIGNATURE");
    expect(handler).not.toHaveBeenCalled();
    expect(db.state.events).toEqual([]);
  });

  it("skips a duplicate of a processed event", async () => {
    const handler = vi.fn(async () => {});
    handlerMock.handlers[event.event_type] = handler;
    const app = buildApp();
    await send(app, body, signedHeaders(body));
    const res = await send(app, body, signedHeaders(body));
    expect(res.statusCode).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the handler fails and re-runs it on retry", async () => {
    const handler = vi.fn().mockRejectedValueOnce(new Error("sandbox down")).mockResolvedValueOnce(undefined);
    handlerMock.handlers[event.event_type] = handler;
    const app = buildApp();
    const first = await send(app, body, signedHeaders(body));
    expect(first.statusCode).toBe(500);
    expect(db.state.events[0].status).toBe("FAILED");
    const retry = await send(app, body, signedHeaders(body));
    expect(retry.statusCode).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(db.state.events[0].status).toBe("PROCESSED");
  });

  it("records events with no handler as IGNORED", async () => {
    const res = await send(buildApp(), body, signedHeaders(body));
    expect(res.statusCode).toBe(200);
    expect(db.state.events[0].status).toBe("IGNORED");
  });

  it("accepts simulator events outside production only", async () => {
    const simHeaders = signedHeaders(body, "WEBHOOK_ID");
    expect((await send(buildApp(), body, simHeaders)).statusCode).toBe(200);

    db.state.events = [];
    process.env.NODE_ENV = "production";
    expect((await send(buildApp(), body, simHeaders)).statusCode).toBe(400);
  });

  it("fails closed when PAYPAL_WEBHOOK_ID is missing", async () => {
    delete process.env.PAYPAL_WEBHOOK_ID;
    const res = await send(buildApp(), body, signedHeaders(body));
    expect(res.statusCode).toBe(500);
    expect(db.state.events).toEqual([]);
  });

  it("returns 500 when the cert can't be fetched, so PayPal retries", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    // Different cert URL so the cache from earlier tests isn't used.
    const headers = signedHeaders(body, WEBHOOK_ID, "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-other");
    const res = await send(buildApp(), body, headers);
    expect(res.statusCode).toBe(500);
    expect(db.state.events).toEqual([]);
  });

  it("leaves JSON parsing alone for other plugins", async () => {
    const res = await buildApp().inject({ method: "POST", url: "/echo", payload: { a: 1 } });
    expect(res.json()).toEqual({ a: 1 });
  });
});
