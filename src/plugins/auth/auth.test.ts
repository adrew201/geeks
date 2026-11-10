import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

// In-memory stand-in for the database. Everything else is real: routes, schemas,
// password hashing, JWT signing and the shared error handler.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown> & { email?: string; id?: string; gamerTag?: string };
  const state = { users: [] as Row[], profiles: [] as Row[] };
  const unique = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
  const tx = {
    user: {
      create: async ({ data }: { data: Row }) => {
        if (state.users.some((u) => u.email === data.email)) throw unique();
        const row = {
          id: `user-${state.users.length + 1}`,
          role: "GAMER",
          tier: "FREE",
          isVerifiedAdult: false,
          ...data,
        };
        state.users.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: Row }) =>
        state.users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null,
    },
    gamerProfile: {
      create: async ({ data }: { data: Row }) => {
        state.profiles.push(data);
        return data;
      },
      findUnique: async ({ where }: { where: Row }) =>
        state.profiles.find((p) => p.gamerTag === where.gamerTag) ?? null,
    },
  };
  return { state, prisma: { ...tx, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } };
});

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));

const { setupCore } = await import("../../lib/core.js");
const { default: authPlugin } = await import("./index.js");

function makeApp() {
  const app = Fastify();
  setupCore(app);
  app.register(authPlugin, { prefix: "/auth" });
  return app;
}

const gamer = { email: "Gamer@Example.com", password: "supersecret1", displayName: "Gamer One", role: "GAMER" };

describe("auth", () => {
  beforeEach(() => {
    db.state.users.length = 0;
    db.state.profiles.length = 0;
  });

  it("signs up a Gamer: FREE tier, token, and a Gamer ID", async () => {
    const res = await makeApp().inject({ method: "POST", url: "/auth/signup", payload: gamer });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.user).toMatchObject({ email: "gamer@example.com", role: "GAMER", tier: "FREE" });
    expect(db.state.profiles).toHaveLength(1);
    expect(db.state.profiles[0].gamerTag).toMatch(/^P2P-\d{5}$/);
  });

  it("signs up a Coach and a Sponsor (no Gamer ID)", async () => {
    const app = makeApp();
    for (const role of ["COACH", "SPONSOR"]) {
      const res = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: { ...gamer, email: `${role}@example.com`, role },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().user.role).toBe(role);
    }
    expect(db.state.profiles).toHaveLength(0);
  });

  it("never returns the password hash, and stores it hashed", async () => {
    const res = await makeApp().inject({ method: "POST", url: "/auth/signup", payload: gamer });
    expect(JSON.stringify(res.json())).not.toContain("passwordHash");
    expect(db.state.users[0].passwordHash).not.toContain("supersecret1");
  });

  it("rejects a duplicate email (case-insensitive) with 409", async () => {
    const app = makeApp();
    await app.inject({ method: "POST", url: "/auth/signup", payload: gamer });
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { ...gamer, email: "GAMER@example.com" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("rejects ADMIN self-signup, short passwords and bad emails with 400", async () => {
    const app = makeApp();
    for (const bad of [{ role: "ADMIN" }, { password: "short" }, { email: "not-an-email" }]) {
      const res = await app.inject({ method: "POST", url: "/auth/signup", payload: { ...gamer, ...bad } });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    }
    expect(db.state.users).toHaveLength(0);
  });

  it("logs in with the right password and refuses the wrong one", async () => {
    const app = makeApp();
    await app.inject({ method: "POST", url: "/auth/signup", payload: gamer });

    const ok = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "gamer@example.com", password: gamer.password },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().token).toBeTruthy();

    const wrong = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "gamer@example.com", password: "wrong-password" },
    });
    const unknown = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nobody@example.com", password: "whatever123" },
    });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    // does not reveal which emails exist
    expect(wrong.json().error.message).toBe(unknown.json().error.message);
  });

  it("GET /auth/me needs a token and reads the tier fresh from the database", async () => {
    const app = makeApp();
    const { token } = (await app.inject({ method: "POST", url: "/auth/signup", payload: gamer })).json();

    const anon = await app.inject({ method: "GET", url: "/auth/me" });
    expect(anon.statusCode).toBe(401);
    expect(anon.json().error.code).toBe("UNAUTHENTICATED");

    const auth = { authorization: `Bearer ${token}` };
    const before = await app.inject({ method: "GET", url: "/auth/me", headers: auth });
    expect(before.json().user.tier).toBe("FREE");

    // a subscription webhook upgrades the user after the token was issued
    db.state.users[0].tier = "PAID";
    const after = await app.inject({ method: "GET", url: "/auth/me", headers: auth });
    expect(after.json().user.tier).toBe("PAID");
  });
});
