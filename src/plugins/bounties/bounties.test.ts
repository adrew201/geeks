import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";

// In-memory stand-in for the database. Everything else is real: the bounty
// routes, the shape mapping, and the creator/write guards.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = {
    bounties: [] as Row[],
    submissions: [] as Row[],
    findManyArgs: null as null | Row,
  };
  const attach = (s: Row): Row => ({
    ...s,
    clip: { videoUrl: `https://example.com/${s.id}.mp4` },
    gamer: { displayName: `gamer ${s.gamerId}`, profile: { gamerTag: `tag-${s.gamerId}` } },
  });
  return {
    state,
    prisma: {
      bounty: {
        findMany: async (args: Row) => {
          state.findManyArgs = args;
          return state.bounties;
        },
        findUnique: async ({ where }: { where: Row }) => {
          const b = state.bounties.find((x) => x.id === where.id);
          if (!b) return null;
          return {
            ...b,
            submissions: state.submissions
              .filter((s) => s.bountyId === b.id)
              .map(attach),
          };
        },
      },
      bountySubmission: {
        findUnique: async ({ where }: { where: Row }) =>
          state.submissions.find((s) => s.id === where.id) ?? null,
        update: async ({ where, data }: { where: Row; data: Row }) => {
          const s = state.submissions.find((x) => x.id === where.id);
          if (!s) throw Object.assign(new Error("No BountySubmission found"), { code: "P2025" });
          Object.assign(s, data);
          return attach(s);
        },
      },
    },
  };
});

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));

import { setupCore } from "../../lib/core.js";
import bountiesPlugin from "./index.js";

function bountyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "bounty-1",
    creatorId: "creator-1",
    bountyType: "CHALLENGE",
    title: "Win a 1v3",
    taskDescription: "Post a 1v3 clutch clip",
    game: "Valorant",
    rewardAmount: "25.00",
    deadline: new Date("2026-12-31T00:00:00.000Z"),
    status: "OPEN_ESCROWED",
    communityId: null,
    ...overrides,
  };
}

function submissionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sub-1",
    bountyId: "bounty-1",
    gamerId: "gamer-1",
    status: "SUBMITTED",
    aiVerificationStatus: "PENDING",
    aiConfidenceScore: null,
    aiReviewNotes: null,
    creatorConfirmed: false,
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify();
  setupCore(app);
  await app.register(bountiesPlugin);
  return app;
}

function token(app: FastifyInstance, sub: string) {
  return app.jwt.sign({ sub, role: "GAMER", tier: "FREE" });
}

beforeEach(() => {
  db.state.bounties = [bountyRow()];
  db.state.submissions = [
    submissionRow({ id: "sub-1", gamerId: "gamer-1" }),
    submissionRow({ id: "sub-2", gamerId: "gamer-2" }),
  ];
  db.state.findManyArgs = null;
});

describe("GET /bounties", () => {
  it("lists open bounties in the ApiBounty shape", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/bounties" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(db.state.findManyArgs?.where).toEqual({ status: "OPEN_ESCROWED" });
    const body = res.json() as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: "bounty-1",
      type: "CHALLENGE",
      title: "Win a 1v3",
      task: "Post a 1v3 clutch clip",
      game: "Valorant",
      reward: 2500,
      rewardAmount: "25.00",
      status: "OPEN_ESCROWED",
    });
  });
});

describe("GET /bounties/:id", () => {
  it("shows every entry to the creator", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/bounties/bounty-1",
      headers: { authorization: `Bearer ${token(app, "creator-1")}` },
    });
    await app.close();

    const body = res.json() as { submissions: unknown[] };
    expect(res.statusCode).toBe(200);
    expect(body.submissions).toHaveLength(2);
  });

  it("shows only their own entry to another gamer", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/bounties/bounty-1",
      headers: { authorization: `Bearer ${token(app, "gamer-2")}` },
    });
    await app.close();

    const body = res.json() as { submissions: Array<{ gamerId: string }> };
    expect(body.submissions).toHaveLength(1);
    expect(body.submissions[0].gamerId).toBe("gamer-2");
  });

  it("maps entries to the ApiBountySubmission shape", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/bounties/bounty-1" });
    await app.close();

    const body = res.json() as { submissions: Array<Record<string, unknown>> };
    expect(body.submissions[0]).toMatchObject({
      id: "sub-1",
      gamerId: "gamer-1",
      gamerTag: "tag-gamer-1",
      clipUrl: "https://example.com/sub-1.mp4",
      note: null,
      status: "SUBMITTED",
    });
  });

  it("returns 404 for an unknown bounty", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/bounties/nope" });
    await app.close();
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /bounties/:id/submissions/:submissionId/reject", () => {
  it("lets the creator reject an entry", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bounties/bounty-1/submissions/sub-1/reject",
      headers: { authorization: `Bearer ${token(app, "creator-1")}` },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body).toMatchObject({ id: "sub-1", status: "DECLINED" });
    expect(db.state.submissions.find((s) => s.id === "sub-1")?.status).toBe("DECLINED");
  });

  it("returns 403 for a non-creator", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bounties/bounty-1/submissions/sub-1/reject",
      headers: { authorization: `Bearer ${token(app, "gamer-1")}` },
    });
    await app.close();
    expect(res.statusCode).toBe(403);
  });

  it("returns 401 without a token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bounties/bounty-1/submissions/sub-1/reject",
    });
    await app.close();
    expect(res.statusCode).toBe(401);
  });

  it("returns 409 for the winning entry", async () => {
    db.state.submissions.find((s) => s.id === "sub-1")!.status = "WINNER_APPROVED";
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bounties/bounty-1/submissions/sub-1/reject",
      headers: { authorization: `Bearer ${token(app, "creator-1")}` },
    });
    await app.close();
    expect(res.statusCode).toBe(409);
  });

  it("returns 404 for an entry from another bounty", async () => {
    db.state.submissions.push(submissionRow({ id: "sub-x", bountyId: "bounty-9" }));
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bounties/bounty-1/submissions/sub-x/reject",
      headers: { authorization: `Bearer ${token(app, "creator-1")}` },
    });
    await app.close();
    expect(res.statusCode).toBe(404);
  });
});
