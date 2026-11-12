import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

// In-memory stand-in for the database. Everything else is real: the clips
// routes, the feed envelope, and the ad interleaving.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = {
    clips: [] as Row[],
    campaign: null as null | Row,
  };
  return {
    state,
    prisma: {
      clip: {
        findMany: async ({ skip = 0, take = 20, where }: { skip?: number; take?: number; where?: Row }) => {
          const game = where?.game as string | undefined;
          const rows = state.clips.filter((c) => !game || c.game === game);
          return rows.slice(skip, skip + take);
        },
      },
      adCampaign: {
        findFirst: async () => state.campaign,
      },
    },
  };
});

vi.mock("../../lib/prisma.js", () => ({ prisma: db.prisma }));
vi.mock("../../lib/queues.js", () => ({ clipAnalysisQueue: { add: async () => undefined } }));

import { clipRoutes } from "./routes.js";
import { toHouseAd } from "./service.js";

function makeClip(index: number, game = "Valorant"): Record<string, unknown> {
  return {
    id: `clip-${index}`,
    gamerId: `gamer-${index % 2}`,
    videoUrl: `https://example.com/clip-${index}.mp4`,
    description: `clip ${index}`,
    game,
    aiTags: ["clutch"],
    aiKeyMoments: [],
    aiQualityScore: 80,
    eloRating: 1500 - index,
    aiAnalysisStatus: "COMPLETED",
    gamer: {
      displayName: "Gamer",
      region: "KE",
      profile: { gamerTag: "tag", radScore: 10 },
    },
  };
}

const campaign = {
  id: "camp-1",
  campaignName: "Go ad-free with Play2Pro Paid",
  clickThroughUrl: "/upgrade",
};

async function get(path: string) {
  const app = Fastify();
  await app.register(clipRoutes);
  const res = await app.inject({ method: "GET", url: path });
  await app.close();
  return res;
}

beforeEach(() => {
  db.state.clips = [];
  db.state.campaign = null;
});

describe("GET /clips/feed", () => {
  it("returns { items, nextCursor } with one ad after every 5 clips", async () => {
    db.state.clips = Array.from({ length: 6 }, (_, i) => makeClip(i));
    db.state.campaign = campaign;

    const res = await get("/clips/feed");
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: Array<{ kind: string }>; nextCursor: string | null };
    expect(body.nextCursor).toBeNull();
    expect(body.items).toHaveLength(7);
    expect(body.items.filter((i) => i.kind === "clip")).toHaveLength(6);
    expect(body.items[5]).toEqual({
      kind: "ad",
      ad: {
        id: "camp-1",
        title: "Go ad-free with Play2Pro Paid",
        body: "",
        ctaLabel: "Learn more",
        ctaUrl: "/upgrade",
      },
    });
  });

  it("serves the same envelope from the temporary /feed alias", async () => {
    db.state.clips = [makeClip(0)];

    const res = await get("/feed");
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: Array<{ kind: string }> };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].kind).toBe("clip");
  });

  it("returns clips only when no ACTIVE campaign exists", async () => {
    db.state.clips = Array.from({ length: 6 }, (_, i) => makeClip(i));

    const res = await get("/clips/feed");
    const body = res.json() as { items: Array<{ kind: string }> };
    expect(body.items).toHaveLength(6);
    expect(body.items.every((i) => i.kind === "clip")).toBe(true);
  });

  it("pages with nextCursor and interleaves ads across the page", async () => {
    db.state.clips = Array.from({ length: 21 }, (_, i) => makeClip(i));
    db.state.campaign = campaign;

    const res = await get("/clips/feed");
    const body = res.json() as { items: Array<{ kind: string }>; nextCursor: string | null };
    expect(body.nextCursor).toBe("20");
    expect(body.items.filter((i) => i.kind === "clip")).toHaveLength(20);
    expect(body.items.filter((i) => i.kind === "ad")).toHaveLength(4);
  });

  it("filters clips by ?game=", async () => {
    db.state.clips = [makeClip(0, "Valorant"), makeClip(1, "Chess"), makeClip(2, "Valorant")];

    const res = await get("/clips/feed?game=Valorant");
    const body = res.json() as { items: Array<{ kind: string; clip: { game: string } }> };
    expect(body.items).toHaveLength(2);
    expect(body.items.every((i) => i.clip.game === "Valorant")).toBe(true);
  });
});

describe("toHouseAd", () => {
  it("maps the campaign to the web HouseAd shape", () => {
    expect(toHouseAd(campaign)).toEqual({
      id: "camp-1",
      title: "Go ad-free with Play2Pro Paid",
      body: "",
      ctaLabel: "Learn more",
      ctaUrl: "/upgrade",
    });
  });
});
