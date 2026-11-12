import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

// In-memory stand-in for the database, plus a stubbed recordVote: the real
// write path is covered elsewhere, so this test pins the O2 route wiring —
// JWT in, voterId out of the token, direction-only body, 409 passthrough.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = {
    clip: null as null | Row,
    existingVote: null as null | Row,
  };
  return {
    state,
    prisma: {
      clip: {
        findUnique: async () => state.clip,
        findUniqueOrThrow: async () => {
          if (!state.clip) throw Object.assign(new Error("No Clip found"), { code: "P2025" });
          return state.clip;
        },
      },
      swipeVote: {
        findUnique: async () => state.existingVote,
      },
      gamerProfile: {
        findUnique: async () => ({ radScore: 10 }),
      },
    },
  };
});

const recordVote = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));
vi.mock("../../lib/queues.js", () => ({ clipAnalysisQueue: { add: async () => undefined } }));
vi.mock("../../lib/ranking/index.js", () => ({
  recordVote,
  recomputeRadScore: vi.fn(async () => undefined),
}));

import { setupCore } from "../../lib/core.js";
import { clipRoutes } from "./routes.js";

function makeClipRow(): Record<string, unknown> {
  return {
    id: "clip-1",
    gamerId: "gamer-1",
    videoUrl: "https://example.com/clip-1.mp4",
    description: "clip 1",
    game: "Valorant",
    aiTags: ["clutch"],
    aiKeyMoments: [],
    aiQualityScore: 80,
    eloRating: 1500,
    aiAnalysisStatus: "COMPLETED",
  };
}

async function authedInject(opts: { token?: string; body?: unknown }) {
  const app = Fastify();
  setupCore(app);
  await app.register(clipRoutes);
  const token =
    opts.token ?? app.jwt.sign({ sub: "voter-1", role: "GAMER", tier: "FREE" });
  const res = await app.inject({
    method: "POST",
    url: "/clips/clip-1/vote",
    headers: { authorization: `Bearer ${token}` },
    payload: opts.body ?? { direction: "UP" },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  db.state.clip = makeClipRow();
  db.state.existingVote = null;
  recordVote.mockClear();
});

describe("POST /clips/:id/vote (O2)", () => {
  it("returns 401 without a token", async () => {
    const app = Fastify();
    setupCore(app);
    await app.register(clipRoutes);
    const res = await app.inject({
      method: "POST",
      url: "/clips/clip-1/vote",
      payload: { direction: "UP" },
    });
    await app.close();
    expect(res.statusCode).toBe(401);
    expect(recordVote).not.toHaveBeenCalled();
  });

  it("votes as the token subject and ignores no voterId in the body", async () => {
    const res = await authedInject({});
    expect(res.statusCode).toBe(200);
    expect(recordVote).toHaveBeenCalledWith("clip-1", "voter-1", "UPVOTE");
  });

  it("ignores voterId in the body and votes as the token subject", async () => {
    // Fastify strips unknown body properties, so a spoofed voterId can never
    // override the token identity.
    const res = await authedInject({ body: { direction: "UP", voterId: "voter-2" } });
    expect(res.statusCode).toBe(200);
    expect(recordVote).toHaveBeenCalledWith("clip-1", "voter-1", "UPVOTE");
  });

  it("returns 409 for a repeat vote", async () => {
    db.state.existingVote = { id: "vote-1", voterId: "voter-1", clipId: "clip-1", voteType: "UPVOTE" };

    const res = await authedInject({});
    expect(res.statusCode).toBe(409);
    expect(recordVote).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown clip", async () => {
    db.state.clip = null;

    const res = await authedInject({});
    expect(res.statusCode).toBe(404);
  });
});
