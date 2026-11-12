import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { setupCore } from "../../lib/core.js";

// In-memory subscriptions and users. PayPal is faked; the database rules (one open plan, tier
// changes only from webhooks) are what these tests check.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = { subs: [] as Row[], users: [] as Row[] };
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([k, v]) =>
      v && typeof v === "object" && "in" in v ? (v as { in: unknown[] }).in.includes(row[k]) : row[k] === v,
    );
  const subscription = {
    findFirst: async ({ where }: { where: Row }) => state.subs.find((s) => matches(s, where)) ?? null,
    findUnique: async ({ where }: { where: Row }) => state.subs.find((s) => matches(s, where)) ?? null,
    create: async ({ data }: { data: Row }) => {
      const row = {
        id: `sub-${state.subs.length + 1}`,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        createdAt: new Date(),
        ...data,
      };
      state.subs.push(row);
      return row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) =>
      Object.assign(state.subs.find((s) => matches(s, where))!, data),
    count: async ({ where }: { where: Row }) => state.subs.filter((s) => matches(s, where)).length,
  };
  const user = {
    update: async ({ where, data }: { where: Row; data: Row }) =>
      Object.assign(state.users.find((u) => matches(u, where))!, data),
  };
  const tx = { subscription, user };
  return { state, tx, prisma: { ...tx, $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) } };
});

const paypal = vi.hoisted(() => ({
  createSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  captureCheckoutOrder: vi.fn(),
  payout: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));
vi.mock("./service.js", () => paypal);

import payments from "./index.js";
import { makeHandlers } from "../webhooks/handlers.js";

const GAMER = "11111111-1111-4111-8111-111111111111";
const COACH = "22222222-2222-4222-8222-222222222222";
const PAYPAL_SUB = "I-SUB-1";
const handlers = makeHandlers({ donationFeeBps: 500, donationFeeBpsPaidGamer: 250, bountyCommissionBps: 1000 });

async function call(method: "GET" | "POST", url: string, as: { sub: string; role: "GAMER" | "COACH" }, payload?: object) {
  process.env.JWT_SECRET = "test-secret";
  process.env.PAYPAL_PLAN_ID_PAID_GAMER = "P-PAID";
  process.env.PAYPAL_PLAN_ID_COACH = "P-COACH";
  const app = Fastify();
  setupCore(app);
  app.register(payments, { prefix: "/api/v1" });
  await app.ready();
  const token = app.jwt.sign({ sub: as.sub, role: as.role, tier: "FREE" });
  return app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
}

const event = (type: string, id: string, resource: object = { id }) => ({
  id: `WH-${type}-${Math.random()}`,
  event_type: type,
  resource,
  create_time: "2026-11-11T00:00:00Z",
});

const subOf = (paypalId: string) => db.state.subs.find((s) => s.paypalSubscriptionId === paypalId)!;
const tierOf = (userId: string) => db.state.users.find((u) => u.id === userId)?.tier;

beforeEach(() => {
  db.state.subs = [];
  db.state.users = [
    { id: GAMER, tier: "FREE" },
    { id: COACH, tier: "FREE" },
  ];
  paypal.createSubscription.mockReset().mockResolvedValue({
    subscriptionId: PAYPAL_SUB,
    approvalUrl: "https://www.sandbox.paypal.com/approve?token=I-SUB-1",
  });
  paypal.cancelSubscription.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/v1/subscriptions", () => {
  it("starts a PAID_GAMER subscription for a gamer and returns the approval link", async () => {
    const res = await call("POST", "/api/v1/subscriptions", { sub: GAMER, role: "GAMER" }, { plan: "PAID_GAMER" });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ subscriptionId: PAYPAL_SUB, approvalUrl: expect.stringContaining("paypal.com") });
    expect(paypal.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ planId: "P-PAID", customId: GAMER }),
    );
    expect(subOf(PAYPAL_SUB)).toMatchObject({ userId: GAMER, plan: "PAID_GAMER", status: "APPROVAL_PENDING" });
  });

  it("refuses a gamer who asks for the COACH plan, and a coach who asks for PAID_GAMER", async () => {
    const gamer = await call("POST", "/api/v1/subscriptions", { sub: GAMER, role: "GAMER" }, { plan: "COACH" });
    expect(gamer.statusCode).toBe(403);
    expect(gamer.json().error.code).toBe("FORBIDDEN_ROLE");

    const coach = await call("POST", "/api/v1/subscriptions", { sub: COACH, role: "COACH" }, { plan: "PAID_GAMER" });
    expect(coach.statusCode).toBe(403);
    expect(paypal.createSubscription).not.toHaveBeenCalled();
  });

  it("refuses a second subscription while one is pending or active (409)", async () => {
    await call("POST", "/api/v1/subscriptions", { sub: GAMER, role: "GAMER" }, { plan: "PAID_GAMER" });
    const again = await call("POST", "/api/v1/subscriptions", { sub: GAMER, role: "GAMER" }, { plan: "PAID_GAMER" });
    expect(again.statusCode).toBe(409);
    expect(paypal.createSubscription).toHaveBeenCalledTimes(1);
  });

  it("rejects a plan name outside the two allowed values (400)", async () => {
    const res = await call("POST", "/api/v1/subscriptions", { sub: GAMER, role: "GAMER" }, { plan: "FREE" });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/v1/orders/:subscriptionId (the /pay/return poll)", () => {
  it("is PENDING until the ACTIVATED webhook, then COMPLETED", async () => {
    await call("POST", "/api/v1/subscriptions", { sub: GAMER, role: "GAMER" }, { plan: "PAID_GAMER" });
    const before = await call("GET", `/api/v1/orders/${PAYPAL_SUB}`, { sub: GAMER, role: "GAMER" });
    expect(before.statusCode).toBe(200);
    expect(before.json()).toMatchObject({ orderId: PAYPAL_SUB, status: "PENDING", purpose: "SUBSCRIPTION", plan: "PAID_GAMER" });

    await handlers["BILLING.SUBSCRIPTION.ACTIVATED"]!(db.tx as never, event("BILLING.SUBSCRIPTION.ACTIVATED", PAYPAL_SUB) as never);
    const after = await call("GET", `/api/v1/orders/${PAYPAL_SUB}`, { sub: GAMER, role: "GAMER" });
    expect(after.json().status).toBe("COMPLETED");
  });

  it("is 404 for someone else's subscription or an unknown id", async () => {
    await call("POST", "/api/v1/subscriptions", { sub: GAMER, role: "GAMER" }, { plan: "PAID_GAMER" });
    expect((await call("GET", `/api/v1/orders/${PAYPAL_SUB}`, { sub: COACH, role: "COACH" })).statusCode).toBe(404);
    expect((await call("GET", "/api/v1/orders/I-NOPE", { sub: GAMER, role: "GAMER" })).statusCode).toBe(404);
  });
});

describe("POST /api/v1/subscriptions/me/cancel", () => {
  it("returns 404 when the user has no active subscription", async () => {
    const res = await call("POST", "/api/v1/subscriptions/me/cancel", { sub: GAMER, role: "GAMER" });
    expect(res.statusCode).toBe(404);
  });

  it("asks PayPal to cancel the active subscription and leaves the tier alone", async () => {
    db.state.subs.push({ id: "s1", userId: GAMER, plan: "PAID_GAMER", paypalSubscriptionId: PAYPAL_SUB, status: "ACTIVE" });
    db.state.users[0].tier = "PAID";
    const res = await call("POST", "/api/v1/subscriptions/me/cancel", { sub: GAMER, role: "GAMER" });
    expect(res.statusCode).toBe(202);
    expect(paypal.cancelSubscription).toHaveBeenCalledWith(PAYPAL_SUB, expect.any(String));
    expect(tierOf(GAMER)).toBe("PAID");
  });
});

describe("BILLING.SUBSCRIPTION webhook handlers", () => {
  const run = (type: string, resource: object) => {
    const h = handlers[type]!;
    return h(db.tx as never, event(type, PAYPAL_SUB, resource) as never);
  };
  beforeEach(() => {
    db.state.subs.push({ id: "s1", userId: GAMER, plan: "PAID_GAMER", paypalSubscriptionId: PAYPAL_SUB, status: "APPROVAL_PENDING" });
  });

  it("ACTIVATED marks the subscription ACTIVE, sets the period, and makes the user PAID", async () => {
    await run("BILLING.SUBSCRIPTION.ACTIVATED", {
      id: PAYPAL_SUB,
      billing_info: { last_payment: { time: "2026-11-11T00:00:00Z" }, next_billing_time: "2026-12-11T00:00:00Z" },
    });
    expect(subOf(PAYPAL_SUB)).toMatchObject({ status: "ACTIVE" });
    expect(subOf(PAYPAL_SUB).currentPeriodEnd).toEqual(new Date("2026-12-11T00:00:00Z"));
    expect(tierOf(GAMER)).toBe("PAID");
  });

  it("ACTIVATED replayed twice leaves the same state", async () => {
    await run("BILLING.SUBSCRIPTION.ACTIVATED", { id: PAYPAL_SUB });
    await run("BILLING.SUBSCRIPTION.ACTIVATED", { id: PAYPAL_SUB });
    expect(subOf(PAYPAL_SUB).status).toBe("ACTIVE");
    expect(tierOf(GAMER)).toBe("PAID");
  });

  it("CANCELLED drops the user to FREE when no other subscription is active", async () => {
    await run("BILLING.SUBSCRIPTION.ACTIVATED", { id: PAYPAL_SUB });
    await run("BILLING.SUBSCRIPTION.CANCELLED", { id: PAYPAL_SUB });
    expect(subOf(PAYPAL_SUB).status).toBe("CANCELLED");
    expect(tierOf(GAMER)).toBe("FREE");
  });

  it("CANCELLED keeps PAID when another subscription of the user is still ACTIVE", async () => {
    db.state.subs.push({ id: "s2", userId: GAMER, plan: "PAID_GAMER", paypalSubscriptionId: "I-SUB-2", status: "ACTIVE" });
    await run("BILLING.SUBSCRIPTION.ACTIVATED", { id: PAYPAL_SUB });
    await run("BILLING.SUBSCRIPTION.CANCELLED", { id: PAYPAL_SUB });
    expect(tierOf(GAMER)).toBe("PAID");
  });

  it("EXPIRED and SUSPENDED record their status and downgrade the same way", async () => {
    await run("BILLING.SUBSCRIPTION.ACTIVATED", { id: PAYPAL_SUB });
    await run("BILLING.SUBSCRIPTION.SUSPENDED", { id: PAYPAL_SUB });
    expect(subOf(PAYPAL_SUB).status).toBe("SUSPENDED");
    expect(tierOf(GAMER)).toBe("FREE");
  });

  it("an event for a subscription we don't know changes nothing and does not throw", async () => {
    await expect(run("BILLING.SUBSCRIPTION.ACTIVATED", { id: "I-UNKNOWN" })).resolves.toBeUndefined();
    expect(tierOf(GAMER)).toBe("FREE");
    expect(subOf(PAYPAL_SUB).status).toBe("APPROVAL_PENDING");
  });
});
