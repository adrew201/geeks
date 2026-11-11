import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { setupCore } from "../lib/core.js";
import { requireRole, requireTier, requireVerifiedAdult } from "./guards.js";

// In-memory users. Everything else is real: JWT, app.authenticate and the error handler.
const db = vi.hoisted(() => {
  const state = { users: [] as { id: string; tier: string; isVerifiedAdult: boolean }[] };
  return {
    state,
    prisma: {
      user: { findUnique: async ({ where }: { where: { id: string } }) => state.users.find((u) => u.id === where.id) ?? null },
    },
  };
});
vi.mock("../lib/prisma.js", () => ({ prisma: db.prisma }));

async function buildApp() {
  process.env.JWT_SECRET = "test-secret";
  const app = Fastify();
  setupCore(app);
  app.register(async (a) => {
    a.get("/coach-only", { preHandler: [a.authenticate, requireRole("COACH")] }, async () => ({ ok: true }));
    a.get("/paid-only", { preHandler: [a.authenticate, requireTier("PAID")] }, async () => ({ ok: true }));
    a.get("/adult-only", { preHandler: [a.authenticate, requireVerifiedAdult()] }, async () => ({ ok: true }));
  });
  await app.ready();
  return app;
}

describe("guards", () => {
  beforeEach(() => {
    db.state.users = [
      { id: "minor", tier: "FREE", isVerifiedAdult: false },
      { id: "adult", tier: "PAID", isVerifiedAdult: true },
    ];
  });

  const get = async (url: string, token?: string) => {
    const app = await buildApp();
    return app.inject({ method: "GET", url, headers: token ? { authorization: `Bearer ${token}` } : {} });
  };
  const token = async (sub: string, role: "GAMER" | "COACH" = "GAMER", tier: "FREE" | "PAID" = "FREE") =>
    (await buildApp()).jwt.sign({ sub, role, tier });

  it("returns 401 without a token", async () => {
    expect((await get("/adult-only")).statusCode).toBe(401);
  });

  it("requireRole allows a listed role and rejects others", async () => {
    expect((await get("/coach-only", await token("adult", "COACH"))).statusCode).toBe(200);
    const res = await get("/coach-only", await token("adult", "GAMER"));
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN_ROLE");
  });

  it("requireTier reads tier from the database, not the token", async () => {
    // Token says PAID but the database says FREE (e.g. subscription cancelled since login).
    const res = await get("/paid-only", await token("minor", "GAMER", "PAID"));
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN_TIER");
    expect((await get("/paid-only", await token("adult", "GAMER", "FREE"))).statusCode).toBe(200);
  });

  it("requireVerifiedAdult blocks unverified users", async () => {
    const res = await get("/adult-only", await token("minor"));
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("NOT_VERIFIED_ADULT");
    expect((await get("/adult-only", await token("adult"))).statusCode).toBe(200);
  });

  it("returns 401 when the token's user no longer exists", async () => {
    expect((await get("/adult-only", await token("deleted"))).statusCode).toBe(401);
  });
});
