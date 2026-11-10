// Mock API used when env.useMocks is true. Add a route here when a page needs one.
// Unknown routes reject with NOT_FOUND so missing mocks are obvious.

import { ApiError } from "../lib/api-error.ts";
import {
  API_ERROR_CODE,
  ROLE,
  type AuthResponse,
  type DonationResponse,
  type FeedPage,
  type GamerDashboard,
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

route("GET", "/api/v1/feed", (): FeedPage => {
  const items: FeedPage["items"] = mockClips.map((clip) => {
    const owner = mockGamers.find((gamer) => gamer.id === clip.ownerId);
    return {
      kind: "clip",
      clip,
      owner: {
        gamerId: clip.ownerId,
        gamerTag: owner?.gamerTags[0] ?? clip.ownerId,
        region: owner?.region ?? null,
        radScore: owner?.radScore ?? 0,
      },
    };
  });
  items.splice(2, 0, { kind: "ad", ad: mockHouseAd });
  return { items, nextCursor: null };
});

route("POST", "/api/v1/clips/:id/vote", () => undefined);

route("GET", "/api/v1/leaderboard", ({ query }) => {
  const game = query.get("game");
  return game ? mockLeaderboard.filter((entry) => entry.game === game) : mockLeaderboard;
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
