// Mock API used when env.useMocks is true. Add a route here when a page needs one.
// Unknown routes reject with NOT_FOUND so missing mocks are obvious.

import { ApiError } from "../lib/api-error.ts";
import {
  API_ERROR_CODE,
  ROLE,
  TIER,
  type AuthResponse,
  type DonationResponse,
  type FeedPage,
  type GamerDashboard,
  type LeaderboardResponse,
  type Role,
} from "../types/api.ts";
import {
  mockBounties,
  mockClips,
  mockGamers,
  mockHouseAd,
  mockLeaderboard,
  mockUser,
  mockWalletEntries,
} from "./fixtures.ts";

const MOCK_LATENCY_MS = 300;

interface MockContext {
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}

type MockHandler = (ctx: MockContext) => unknown;

interface MockRoute {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: MockHandler;
}

const routes: MockRoute[] = [];

function route(method: string, path: string, handler: MockHandler): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:([A-Za-z]+)/g, (_, key: string) => {
      keys.push(key);
      return "([^/]+)";
    })}$`,
  );
  routes.push({ method, pattern, keys, handler });
}

function notFound(message: string): never {
  throw new ApiError(404, API_ERROR_CODE.NOT_FOUND, message);
}

route("GET", "/health", () => ({ status: "ok", db: "ok", redis: "ok" }));

route("POST", "/auth/login", (): AuthResponse => ({ token: "mock.jwt.token", user: mockUser }));

route("POST", "/auth/signup", ({ body }): AuthResponse => {
  const role = (body as { role?: Role } | undefined)?.role ?? ROLE.GAMER;
  return { token: "mock.jwt.token", user: { ...mockUser, role } };
});

/**
 * QA switch for states the happy-path fixtures never reach. Add `?mock=<scenario>` to the
 * page URL, e.g. /feed?mock=vote-fail or /leaderboard?mock=empty. Mock mode only.
 */
type MockScenario = "empty" | "feed-fail" | "vote-fail" | "vote-404" | "leaderboard-fail";

function scenario(): MockScenario | null {
  if (typeof window === "undefined") return null;
  return (new URLSearchParams(window.location.search).get("mock") as MockScenario | null) ?? null;
}

function serverError(): never {
  throw new ApiError(500, API_ERROR_CODE.UNKNOWN_ERROR, "Mock server error.");
}

/** README §19 / .env.example: ADS_EVERY_N_CLIPS=5. Lowered so the demo reaches an ad quickly. */
const MOCK_ADS_EVERY_N_CLIPS = 3;
const MOCK_FEED_PAGE_SIZE = 3;

route("GET", "/api/v1/feed", ({ query }): FeedPage => {
  if (scenario() === "feed-fail") serverError();
  if (scenario() === "empty") return { items: [], nextCursor: null };

  // README §14: the feed excludes the caller's own clips.
  const ownGamerIds = new Set(
    mockGamers.filter((gamer) => gamer.userId === mockUser.id).map((gamer) => gamer.id),
  );
  const clips = mockClips.filter((clip) => !ownGamerIds.has(clip.ownerId));
  const start = Number(query.get("cursor") ?? 0);
  const page = clips.slice(start, start + MOCK_FEED_PAGE_SIZE);

  const items: FeedPage["items"] = [];
  page.forEach((clip, index) => {
    const owner = mockGamers.find((gamer) => gamer.id === clip.ownerId);
    items.push({
      kind: "clip",
      clip,
      owner: {
        gamerId: clip.ownerId,
        gamerTag: owner?.gamerTags[0] ?? clip.ownerId,
        region: owner?.region ?? null,
        radScore: owner?.radScore ?? 0,
      },
    });
    const position = start + index + 1;
    if (mockUser.tier === TIER.FREE && position % MOCK_ADS_EVERY_N_CLIPS === 0) {
      items.push({ kind: "ad", ad: mockHouseAd });
    }
  });

  const next = start + MOCK_FEED_PAGE_SIZE;
  return { items, nextCursor: next < clips.length ? String(next) : null };
});

/** Vote is unique on (clipId, voterId) (README §13). Tracks this tab's votes. */
const mockVotes = new Set<string>();

route("POST", "/api/v1/clips/:id/vote", ({ params }) => {
  if (scenario() === "vote-fail") serverError();
  if (scenario() === "vote-404") notFound("Clip not found.");
  if (!mockClips.some((clip) => clip.id === params.id)) notFound("Clip not found.");
  if (mockVotes.has(params.id)) {
    // UNCONFIRMED: status and code for a repeat vote (see VoteResponse in types/api.ts).
    throw new ApiError(409, API_ERROR_CODE.VALIDATION_ERROR, "You already voted on this clip.");
  }
  mockVotes.add(params.id);
  return undefined;
});

route("GET", "/api/v1/leaderboard", ({ query }): LeaderboardResponse => {
  if (scenario() === "leaderboard-fail") serverError();
  if (scenario() === "empty") return [];
  const game = query.get("game");
  const rows = game ? mockLeaderboard.filter((entry) => entry.game === game) : mockLeaderboard;
  // Ranks are per game, so re-number after filtering.
  return rows.map((entry, index) => ({ ...entry, rank: index + 1 }));
});

route("GET", "/api/v1/gamers/:id", ({ params }) => {
  return mockGamers.find((gamer) => gamer.id === params.id) ?? notFound("Gamer not found.");
});

route("GET", "/api/v1/gamers/:id/dashboard", ({ params }): GamerDashboard => {
  const profile = mockGamers.find((gamer) => gamer.id === params.id) ?? notFound("Gamer not found.");
  return {
    profile,
    radScoreHistory: [
      { date: "2026-11-07T00:00:00.000Z", radScore: profile.radScore - 260 },
      { date: "2026-11-08T00:00:00.000Z", radScore: profile.radScore - 120 },
      { date: "2026-11-09T00:00:00.000Z", radScore: profile.radScore },
    ],
    clips: mockClips.filter((clip) => clip.ownerId === profile.id),
    walletBalance: mockWalletEntries.reduce((sum, entry) => sum + entry.amount, 0),
    walletEntries: mockWalletEntries,
  };
});

route("GET", "/api/v1/bounties", () => mockBounties);

route(
  "POST",
  "/api/v1/donations",
  (): DonationResponse => ({
    approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=MOCK-ORDER-1",
    orderId: "MOCK-ORDER-1",
  }),
);

route("GET", "/api/v1/ads/next", () => mockHouseAd);

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function mockRequest<T>(
  method: string,
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  await delay(MOCK_LATENCY_MS, signal);
  const [path = "", search = ""] = url.split("?");
  for (const candidate of routes) {
    if (candidate.method !== method) continue;
    const match = candidate.pattern.exec(path);
    if (!match) continue;
    const params = Object.fromEntries(
      candidate.keys.map((key, index) => [key, decodeURIComponent(match[index + 1] ?? "")]),
    );
    const result = candidate.handler({ params, query: new URLSearchParams(search), body });
    return (result === undefined ? undefined : structuredClone(result)) as T;
  }
  return notFound(`No mock for ${method} ${path}. Add one in src/mocks/index.ts.`);
}
