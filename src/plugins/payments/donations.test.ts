import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { setupCore } from "../../lib/core.js";

// In-memory users, profiles, donations and wallet entries. PayPal calls are faked.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = {
    users: [] as Row[],
    donations: [] as Row[],
    wallet: [] as Row[],
  };
  const unique = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
  const matches = (row: Row, where: Row) => Object.entries(where).every(([k, v]) => row[k] === v);
  const donation = {
    create: async ({ data }: { data: Row }) => {
      const row = { id: `00000000-0000-4000-8000-00000000000${state.donations.length + 1}`, status: "PENDING", paypalOrderId: null, createdAt: new Date(), ...data };
      state.donations.push(row);
      return row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = state.donations.find((d) => d.id === where.id)!;
      return Object.assign(row, data);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = state.donations.filter((d) => matches(d, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
    findUnique: async ({ where, include }: { where: Row; include?: unknown }) => {
      const row = state.donations.find((d) => matches(d, where));
      if (!row || !include) return row ?? null;
      const recipient = state.users.find((u) => u.id === row.recipientGamerId)!;
      return { ...row, recipient: { profile: recipient.profile ?? null } };
    },
  };
  const user = {
    findFirst: async ({ where }: { where: { role: string; OR: [{ id: string }, { profile: { id: string } }] } }) => {
      const [byId, byProfile] = where.OR;
      return (
        state.users.find(
          (u) => u.role === where.role && (u.id === byId.id || (u.profile as Row | undefined)?.id === byProfile.profile.id),
        ) ?? null
      );
    },
  };
  const walletEntry = {
    create: async ({ data }: { data: Row }) => {
      if (state.wallet.some((w) => w.paypalRef === data.paypalRef && w.kind === data.kind)) throw unique();
      state.wallet.push(data);
      return data;
    },
  };
  return { state, prisma: { user, donation, walletEntry } };
});
const paypal = vi.hoisted(() => ({
  createOrder: vi.fn(),
  captureCheckoutOrder: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));
vi.mock("./service.js", () => paypal);

import payments from "./index.js";
import { completeDonation } from "./donations.js";
import { makeHandlers } from "../webhooks/handlers.js";

const tx = db.prisma as never;
const DONOR = "11111111-1111-4111-8111-111111111111";
const ADULT = "22222222-2222-4222-8222-222222222222";
const ADULT_PROFILE = "33333333-3333-4333-8333-333333333333";
const MINOR = "44444444-4444-4444-8444-444444444444";

async function buildApp() {
  process.env.JWT_SECRET = "test-secret";
  const app = Fastify();
  setupCore(app);
  app.register(payments, { prefix: "/api/v1" });
  await app.ready();
  return app;
}

async function donate(body: object, as = DONOR) {
  const app = await buildApp();
  const token = app.jwt.sign({ sub: as, role: "GAMER", tier: "FREE" });
  return app.inject({ method: "POST", url: "/api/v1/donations", payload: body, headers: { authorization: `Bearer ${token}` } });
}

beforeEach(() => {
  db.state.users = [
    { id: DONOR, role: "GAMER", tier: "FREE", isVerifiedAdult: false },
    { id: ADULT, role: "GAMER", tier: "FREE", isVerifiedAdult: true, profile: { id: ADULT_PROFILE, gamerTag: "P2P-12345" } },
    { id: MINOR, role: "GAMER", tier: "FREE", isVerifiedAdult: false },
  ];
  db.state.donations = [];
  db.state.wallet = [];
  paypal.createOrder.mockReset().mockResolvedValue({ orderId: "ORDER-1", approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1" });
  paypal.captureCheckoutOrder.mockReset();
  delete process.env.DONATION_FEE_BPS;
  delete process.env.DONATION_FEE_BPS_PAID_GAMER;
});

describe("POST /api/v1/donations", () => {
  it("creates a pending donation and returns the PayPal approval link", async () => {
    const res = await donate({ gamerId: ADULT_PROFILE, amount: 500 });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ orderId: "ORDER-1", approvalUrl: expect.stringContaining("paypal.com") });
    expect(db.state.donations[0]).toMatchObject({
      donorId: DONOR, recipientGamerId: ADULT, amountCents: 500, feeCents: 25, netCents: 475, status: "PENDING", paypalOrderId: "ORDER-1",
    });
    expect(paypal.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 500, customId: db.state.donations[0].id, requestId: `donation-${db.state.donations[0].id}` }),
    );
  });

  it("charges paid gamers the lower fee", async () => {
    db.state.users[1].tier = "PAID";
    await donate({ gamerId: ADULT, amount: 1000 });
    expect(db.state.donations[0]).toMatchObject({ feeCents: 25, netCents: 975 });
  });

  it("lets any gamer receive donations, verified or not", async () => {
    const res = await donate({ gamerId: MINOR, amount: 500 });
    expect(res.statusCode).toBe(201);
    expect(paypal.createOrder).toHaveBeenCalled();
    expect(db.state.donations[0]).toMatchObject({ recipientGamerId: MINOR, amountCents: 500 });
  });

  it("lets an unverified donor give to a verified gamer", async () => {
    expect((await donate({ gamerId: ADULT, amount: 500 }, DONOR)).statusCode).toBe(201);
  });

  it("rejects donating to yourself", async () => {
    const res = await donate({ gamerId: ADULT, amount: 500 }, ADULT);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("CANNOT_DONATE_TO_SELF");
  });

  it("rejects amounts outside $1 to $500 and unknown gamers", async () => {
    expect((await donate({ gamerId: ADULT, amount: 99 })).statusCode).toBe(400);
    expect((await donate({ gamerId: ADULT, amount: 50_001 })).statusCode).toBe(400);
    expect((await donate({ gamerId: ADULT, amount: 5.5 })).statusCode).toBe(400);
    expect((await donate({ gamerId: "55555555-5555-4555-8555-555555555555", amount: 500 })).statusCode).toBe(404);
  });

  it("requires a login", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/v1/donations", payload: { gamerId: ADULT, amount: 500 } });
    expect(res.statusCode).toBe(401);
  });

  it("marks the donation FAILED and returns 502 when PayPal is down", async () => {
    paypal.createOrder.mockRejectedValue(new Error("timeout"));
    const res = await donate({ gamerId: ADULT, amount: 500 });
    expect(res.statusCode).toBe(502);
    expect(db.state.donations[0].status).toBe("FAILED");
  });
});

describe("GET /api/v1/orders/:id", () => {
  it("shows the donor the status, and hides it from other users", async () => {
    await donate({ gamerId: ADULT, amount: 500 });
    const app = await buildApp();
    const as = (sub: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub, role: "GAMER", tier: "FREE" })}` });
    const mine = await app.inject({ method: "GET", url: "/api/v1/orders/ORDER-1", headers: as(DONOR) });
    expect(mine.json()).toMatchObject({ orderId: "ORDER-1", status: "PENDING", amount: 500, purpose: "DONATION", gamerId: ADULT_PROFILE });
    const other = await app.inject({ method: "GET", url: "/api/v1/orders/ORDER-1", headers: as(MINOR) });
    expect(other.statusCode).toBe(404);
  });
});

describe("donation webhook handlers", () => {
  const handlers = makeHandlers({ donationFeeBps: 500, donationFeeBpsPaidGamer: 250, bountyCommissionBps: 1000 });
  const capture = { captureId: "CAP-1", status: "COMPLETED", amountCents: 500, currency: "USD" };

  async function pendingDonation() {
    await donate({ gamerId: ADULT, amount: 500 });
    return db.state.donations[0];
  }

  it("CHECKOUT.ORDER.APPROVED captures and credits the gamer: +amount DONATION, -fee FEE", async () => {
    const d = await pendingDonation();
    paypal.captureCheckoutOrder.mockResolvedValue(capture);
    await handlers["CHECKOUT.ORDER.APPROVED"]!(tx, { id: "WH-1", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER-1", intent: "CAPTURE" } });
    expect(paypal.captureCheckoutOrder).toHaveBeenCalledWith("ORDER-1", `capture-${d.id}`);
    expect(d).toMatchObject({ status: "COMPLETED", paypalCaptureId: "CAP-1" });
    expect(db.state.wallet).toEqual([
      expect.objectContaining({ userId: ADULT, kind: "DONATION", amountCents: 500, paypalRef: "CAP-1", donationId: d.id }),
      expect.objectContaining({ userId: ADULT, kind: "FEE", amountCents: -25, paypalRef: "CAP-1", donationId: d.id }),
    ]);
  });

  it("PAYMENT.CAPTURE.COMPLETED after the capture response doesn't credit twice", async () => {
    const d = await pendingDonation();
    paypal.captureCheckoutOrder.mockResolvedValue(capture);
    await handlers["CHECKOUT.ORDER.APPROVED"]!(tx, { id: "WH-1", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER-1", intent: "CAPTURE" } });
    await handlers["PAYMENT.CAPTURE.COMPLETED"]!(tx, {
      id: "WH-2", event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "CAP-1", status: "COMPLETED", custom_id: d.id as string, amount: { value: "5.00", currency_code: "USD" } },
    });
    expect(db.state.wallet).toHaveLength(2);
  });

  it("PAYMENT.CAPTURE.COMPLETED alone credits the gamer (found by order ID)", async () => {
    const d = await pendingDonation();
    await handlers["PAYMENT.CAPTURE.COMPLETED"]!(tx, {
      id: "WH-2", event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "CAP-1", status: "COMPLETED", amount: { value: "5.00", currency_code: "USD" }, supplementary_data: { related_ids: { order_id: "ORDER-1" } } },
    });
    expect(d.status).toBe("COMPLETED");
    expect(db.state.wallet).toHaveLength(2);
  });

  it("does not credit when the captured amount differs from the donation", async () => {
    const d = await pendingDonation();
    const credited = await completeDonation(tx, d.id as string, { ...capture, amountCents: 100 }, { error: () => {} });
    expect(credited).toBe(false);
    expect(d.status).toBe("FAILED");
    expect(db.state.wallet).toEqual([]);
  });

  it("waits on a PENDING capture instead of crediting", async () => {
    const d = await pendingDonation();
    expect(await completeDonation(tx, d.id as string, { ...capture, status: "PENDING" })).toBe(false);
    expect(d.status).toBe("PENDING");
  });

  it("ignores approved bounty orders (intent AUTHORIZE) and unknown orders", async () => {
    await pendingDonation();
    await handlers["CHECKOUT.ORDER.APPROVED"]!(tx, { id: "WH-3", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER-1", intent: "AUTHORIZE" } });
    await handlers["CHECKOUT.ORDER.APPROVED"]!(tx, { id: "WH-4", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER-X", intent: "CAPTURE" } });
    expect(paypal.captureCheckoutOrder).not.toHaveBeenCalled();
  });

  it("PAYMENT.CAPTURE.DENIED marks the donation FAILED, and a non-UUID custom_id is ignored safely", async () => {
    const d = await pendingDonation();
    await handlers["PAYMENT.CAPTURE.DENIED"]!(tx, {
      id: "WH-5", event_type: "PAYMENT.CAPTURE.DENIED",
      resource: { id: "CAP-9", custom_id: "not-a-uuid", supplementary_data: { related_ids: { order_id: "ORDER-1" } } },
    });
    expect(d.status).toBe("FAILED");
    expect(db.state.wallet).toEqual([]);
  });
});
