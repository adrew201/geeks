import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { setupCore } from "../../lib/core.js";

// In-memory users and wallet entries; PayPal payout is faked.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = { users: [] as Row[], wallet: [] as Row[], seq: 0 };
  const unique = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([k, v]) =>
      v && typeof v === "object" && "in" in (v as Row) ? ((v as { in: unknown[] }).in).includes(row[k]) : row[k] === v,
    );
  const walletEntry = {
    aggregate: async ({ where }: { where: Row }) => ({
      _sum: { amountCents: state.wallet.filter((w) => matches(w, where)).reduce((s, w) => s + (w.amountCents as number), 0) || null },
    }),
    findMany: async ({ where }: { where: Row }) => state.wallet.filter((w) => matches(w, where)).slice().reverse(),
    findUnique: async ({ where }: { where: Row }) => state.wallet.find((w) => w.id === where.id) ?? null,
    create: async ({ data }: { data: Row }) => {
      if (data.paypalRef && state.wallet.some((w) => w.paypalRef === data.paypalRef && w.kind === data.kind)) throw unique();
      const row = { id: `00000000-0000-4000-8000-${String(++state.seq).padStart(12, "0")}`, paypalRef: null, payoutStatus: null, createdAt: new Date(), ...data };
      state.wallet.push(row);
      return row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) => Object.assign(state.wallet.find((w) => w.id === where.id)!, data),
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = state.wallet.filter((w) => matches(w, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
  };
  const user = { findUnique: async ({ where }: { where: Row }) => state.users.find((u) => u.id === where.id) ?? null };
  const tx = { walletEntry, user, $executeRaw: async () => 1 };
  const $transaction = async (fn: (t: typeof tx) => Promise<unknown>) => {
    const snapshot = state.wallet.map((w) => ({ ...w }));
    try {
      return await fn(tx);
    } catch (e) {
      state.wallet = snapshot;
      throw e;
    }
  };
  return { state, tx, prisma: { ...tx, $transaction } };
});
const paypal = vi.hoisted(() => {
  class PaypalError extends Error {
    constructor(public status: number, public issue?: string) {
      super(`PayPal ${status}`);
    }
  }
  return { payout: vi.fn(), PaypalError };
});

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));
vi.mock("./service.js", () => paypal);

import payments from "./index.js";
import { makeHandlers } from "../webhooks/handlers.js";

const ADULT = "11111111-1111-4111-8111-111111111111";
const MINOR = "22222222-2222-4222-8222-222222222222";
const NO_EMAIL = "33333333-3333-4333-8333-333333333333";
const handlers = makeHandlers({ donationFeeBps: 500, donationFeeBpsPaidGamer: 250, bountyCommissionBps: 1000 });

async function call(method: "GET" | "POST", url: string, as: string, payload?: object) {
  process.env.JWT_SECRET = "test-secret";
  const app = Fastify();
  setupCore(app);
  app.register(payments, { prefix: "/api/v1" });
  await app.ready();
  const token = app.jwt.sign({ sub: as, role: "GAMER", tier: "FREE" });
  return app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
}

function credit(userId: string, cents: number) {
  db.state.wallet.push({ id: `seed-${db.state.wallet.length}`, userId, kind: "DONATION", amountCents: cents, paypalRef: null, payoutStatus: null, createdAt: new Date() });
}
const withdrawals = () => db.state.wallet.filter((w) => w.kind === "WITHDRAWAL");
const balance = (userId: string) => db.state.wallet.filter((w) => w.userId === userId).reduce((s, w) => s + (w.amountCents as number), 0);

beforeEach(() => {
  db.state.users = [
    { id: ADULT, isVerifiedAdult: true, tier: "FREE", paypalEmail: "gamer@example.com" },
    { id: MINOR, isVerifiedAdult: false, tier: "FREE", paypalEmail: "minor@example.com" },
    { id: NO_EMAIL, isVerifiedAdult: true, tier: "FREE", paypalEmail: null },
  ];
  db.state.wallet = [];
  paypal.payout.mockReset().mockResolvedValue({ payoutBatchId: "BATCH-1", batchStatus: "PENDING" });
  credit(ADULT, 500);
  credit(ADULT, -25);
});

describe("GET /api/v1/wallet", () => {
  it("returns the balance as the sum of entries, and only the caller's own wallet", async () => {
    credit(MINOR, 999);
    const res = await call("GET", "/api/v1/wallet", ADULT);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ balanceCents: 475, pendingWithdrawalCents: 0 });
    expect(res.json().entries).toHaveLength(2);
    expect(res.json().entries[0]).toHaveProperty("amount");
  });
});

describe("POST /api/v1/wallet/withdraw", () => {
  it("debits the wallet and pays out to the stored PayPal email", async () => {
    const res = await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 475 });
    expect(res.statusCode).toBe(201);
    const w = withdrawals()[0];
    expect(w).toMatchObject({ userId: ADULT, amountCents: -475, payoutStatus: "PENDING", payoutBatchId: "BATCH-1" });
    expect(paypal.payout).toHaveBeenCalledWith(expect.objectContaining({
      receiverEmail: "gamer@example.com", amountCents: 475, senderBatchId: `withdrawal-${w.id}`, senderItemId: w.id,
    }));
    expect(balance(ADULT)).toBe(0);
    const wallet = await call("GET", "/api/v1/wallet", ADULT);
    expect(wallet.json()).toMatchObject({ balanceCents: 0, pendingWithdrawalCents: 475 });
  });

  it("refuses more than the balance", async () => {
    const res = await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 476 });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INSUFFICIENT_FUNDS");
    expect(paypal.payout).not.toHaveBeenCalled();
  });

  it("a second withdrawal of the same money fails (double click)", async () => {
    await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 475 });
    const again = await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 475 });
    expect(again.statusCode).toBe(400);
    expect(withdrawals()).toHaveLength(1);
  });

  it("lets any account withdraw, verified or not", async () => {
    credit(MINOR, 500);
    const res = await call("POST", "/api/v1/wallet/withdraw", MINOR, { amount: 100 });
    expect(res.statusCode).toBe(201);
  });

  it("needs a stored PayPal email, and ignores any email sent in the request", async () => {
    credit(NO_EMAIL, 500);
    expect((await call("POST", "/api/v1/wallet/withdraw", NO_EMAIL, { amount: 100 })).json().error.code).toBe("PAYPAL_EMAIL_REQUIRED");
    // Fastify strips unknown fields, so the extra email never reaches withdraw().
    expect((await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 100, email: "thief@example.com" })).statusCode).toBe(201);
    expect(paypal.payout).toHaveBeenCalledWith(expect.objectContaining({ receiverEmail: "gamer@example.com" }));
    expect(paypal.payout).not.toHaveBeenCalledWith(expect.objectContaining({ receiverEmail: "thief@example.com" }));
  });

  it("rejects amounts under $1 or not whole cents", async () => {
    expect((await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 99 })).statusCode).toBe(400);
    expect((await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 1.5 })).statusCode).toBe(400);
  });

  it("puts the money back when PayPal refuses the payout", async () => {
    paypal.payout.mockRejectedValue(new paypal.PaypalError(422, "RECEIVER_UNREGISTERED"));
    const res = await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 475 });
    expect(res.statusCode).toBe(502);
    expect(res.json().error.code).toBe("PAYOUT_FAILED");
    expect(withdrawals()[0].payoutStatus).toBe("FAILED");
    expect(balance(ADULT)).toBe(475);
  });

  it("keeps the withdrawal PENDING on a timeout, because the payout may have gone through", async () => {
    paypal.payout.mockRejectedValue(new Error("The operation was aborted due to timeout"));
    const res = await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 475 });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe("PENDING");
    expect(balance(ADULT)).toBe(0);
  });
});

describe("payout webhooks", () => {
  async function pendingWithdrawal() {
    await call("POST", "/api/v1/wallet/withdraw", ADULT, { amount: 475 });
    return withdrawals()[0];
  }
  const event = (type: string, entryId: string) => ({
    id: `WH-${type}`, event_type: type,
    resource: { payout_item_id: "ITEM-1", transaction_status: "X", payout_item: { sender_item_id: entryId } },
  });

  it("SUCCEEDED marks the withdrawal PAID", async () => {
    const w = await pendingWithdrawal();
    await handlers["PAYMENT.PAYOUTS-ITEM.SUCCEEDED"]!(db.tx as never, event("PAYMENT.PAYOUTS-ITEM.SUCCEEDED", w.id as string));
    expect(w).toMatchObject({ payoutStatus: "PAID", payoutItemId: "ITEM-1" });
    expect(balance(ADULT)).toBe(0);
  });

  it("FAILED returns the money once, even if the event repeats", async () => {
    const w = await pendingWithdrawal();
    const failed = event("PAYMENT.PAYOUTS-ITEM.FAILED", w.id as string);
    await handlers["PAYMENT.PAYOUTS-ITEM.FAILED"]!(db.tx as never, failed);
    await handlers["PAYMENT.PAYOUTS-ITEM.FAILED"]!(db.tx as never, failed);
    expect(w.payoutStatus).toBe("FAILED");
    expect(db.state.wallet.filter((e) => e.kind === "REVERSAL")).toHaveLength(1);
    expect(balance(ADULT)).toBe(475);
  });

  it("RETURNED after SUCCEEDED still returns the money", async () => {
    const w = await pendingWithdrawal();
    await handlers["PAYMENT.PAYOUTS-ITEM.SUCCEEDED"]!(db.tx as never, event("PAYMENT.PAYOUTS-ITEM.SUCCEEDED", w.id as string));
    await handlers["PAYMENT.PAYOUTS-ITEM.RETURNED"]!(db.tx as never, event("PAYMENT.PAYOUTS-ITEM.RETURNED", w.id as string));
    expect(balance(ADULT)).toBe(475);
  });

  it("UNCLAIMED leaves the withdrawal PENDING, and unknown ids are ignored", async () => {
    const w = await pendingWithdrawal();
    expect(handlers["PAYMENT.PAYOUTS-ITEM.UNCLAIMED"]).toBeUndefined();
    await handlers["PAYMENT.PAYOUTS-ITEM.FAILED"]!(db.tx as never, event("PAYMENT.PAYOUTS-ITEM.FAILED", "not-a-uuid"));
    expect(w.payoutStatus).toBe("PENDING");
  });
});
