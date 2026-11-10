// Mock API used when env.useMocks is true. Add a route here when a page needs one.
// Unknown routes reject with NOT_FOUND so missing mocks are obvious.

import { ApiError } from "../lib/api-error.ts";
import { fromApiRole, toApiRole } from "../lib/role-adapter.ts";
import { getSession } from "../lib/session.ts";
import {
  AI_SUMMARY_STATUS,
  API_ERROR_CODE,
  PROFILE_VISIBILITY,
  ROLE,
  TIER,
  type AuthResponse,
  type DonationResponse,
  type FeedPage,
  type GamerDashboard,
  type GamerProfile,
  type LeaderboardResponse,
  type LoginRequest,
  type SignupRequest,
  type UpdateGamerProfileRequest,
  type User,
} from "../types/api.ts";
import {
  mockBounties,
  mockClips,
  mockGamers,
  mockHouseAd,
  mockLeaderboard,
  mockAccounts,
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

/**
 * QA switch for states the happy-path fixtures never reach. Add `?mock=<scenario>` to the
 * page URL, e.g. /feed?mock=vote-fail, /leaderboard?mock=empty, /login?mock=auth-fail,
 * /login?mock=short-session or /gamers/gmr_shadowviper?mock=profile-private. Mock mode only.
 */
type MockScenario =
  | "empty"
  | "feed-fail"
  | "vote-fail"
  | "vote-404"
  | "leaderboard-fail"
  | "auth-fail"
  | "short-session"
  | "profile-fail"
  | "profile-incomplete"
  | "profile-no-ai"
  | "profile-summary-pending"
  | "profile-private"
  | "profile-no-clips"
  | "profile-update-fail"
  | "dashboard-fail";

function scenario(): MockScenario | null {
  if (typeof window === "undefined") return null;
  return (new URLSearchParams(window.location.search).get("mock") as MockScenario | null) ?? null;
}

function serverError(): never {
  throw new ApiError(500, API_ERROR_CODE.UNKNOWN_ERROR, "Mock server error.");
}

/* ------------------------------ auth ------------------------------ */

const MOCK_SESSION_SECONDS = 7 * 24 * 60 * 60; // README: JWT_EXPIRES_IN=7d
const SHORT_SESSION_SECONDS = 20;

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * An unsigned JWT with the README §18 payload, so the client's decode, role-adapter and
 * expiry paths run exactly as they will against the real API. `?mock=short-session`
 * issues a 20-second token to test expiry logout.
 */
function mockToken(user: User): string {
  const lifetime = scenario() === "short-session" ? SHORT_SESSION_SECONDS : MOCK_SESSION_SECONDS;
  const payload = {
    userId: user.id,
    role: toApiRole(user.role),
    tier: user.tier,
    exp: Math.floor(Date.now() / 1000) + lifetime,
  };
  return `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url(payload)}.mock`;
}

function findAccount(email: unknown): User | undefined {
  const normalised = typeof email === "string" ? email.trim().toLowerCase() : "";
  return mockAccounts.find((account) => account.email === normalised);
}

route("POST", "/auth/login", ({ body }): AuthResponse => {
  if (scenario() === "auth-fail") serverError();
  const account = findAccount((body as Partial<LoginRequest> | undefined)?.email);
  if (!account) throw new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Invalid email or password.");
  return { token: mockToken(account) };
});

route("POST", "/auth/signup", ({ body }): AuthResponse => {
  if (scenario() === "auth-fail") serverError();
  const request = (body ?? {}) as Partial<SignupRequest>;
  if (findAccount(request.email)) {
    throw new ApiError(409, API_ERROR_CODE.VALIDATION_ERROR, "This email is already registered.");
  }
  const appRole = fromApiRole(request.role);
  if (!appRole) throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "Choose a valid role.");
  const account: User = {
    id: `usr_new_${mockAccounts.length + 1}`,
    email: String(request.email).trim().toLowerCase(),
    role: appRole.role,
    tier: TIER.FREE,
    isVerifiedAdult: false,
  };
  mockAccounts.push(account);
  return { token: mockToken(account) };
});

/** The signed-in mock user (falls back to the demo gamer before login). */
function currentMockUser(): Pick<User, "id" | "tier"> {
  const session = getSession();
  return session ? { id: session.userId, tier: session.tier } : mockUser;
}

/** README §19 / .env.example: ADS_EVERY_N_CLIPS=5. Lowered so the demo reaches an ad quickly. */
const MOCK_ADS_EVERY_N_CLIPS = 3;
const MOCK_FEED_PAGE_SIZE = 3;

route("GET", "/api/v1/feed", ({ query }): FeedPage => {
  if (scenario() === "feed-fail") serverError();
  if (scenario() === "empty") return { items: [], nextCursor: null };

  // README §14: the feed excludes the caller's own clips.
  const user = currentMockUser();
  const ownGamerIds = new Set(
    mockGamers.filter((gamer) => gamer.userId === user.id).map((gamer) => gamer.id),
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
    if (user.tier === TIER.FREE && position % MOCK_ADS_EVERY_N_CLIPS === 0) {
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

/* ------------------------------ gamer profile ------------------------------ */

/**
 * Finds a gamer by profile id or by userId. UNCONFIRMED: mirrors the assumption in
 * features/profile/api.ts that /passport can load GET /gamers/:userId.
 */
function findGamer(id: string): GamerProfile {
  return (
    mockGamers.find((gamer) => gamer.id === id || gamer.userId === id) ?? notFound("Gamer not found.")
  );
}

/**
 * Profile QA scenarios (page 12 state toolbar), applied to a copy so fixtures stay intact:
 * ?mock=profile-incomplete (state B), profile-no-ai (C), profile-summary-pending (06 review),
 * profile-private (G), profile-fail, plus profile-no-clips / dashboard-fail on the dashboard.
 */
function withProfileScenario(gamer: GamerProfile): GamerProfile {
  switch (scenario()) {
    case "profile-incomplete":
      return { ...gamer, platforms: [], region: null };
    case "profile-no-ai":
      return { ...gamer, aiSummary: null, aiSummaryStatus: undefined };
    case "profile-summary-pending":
      return gamer.aiSummary ? { ...gamer, aiSummaryStatus: AI_SUMMARY_STATUS.PENDING_REVIEW } : gamer;
    case "profile-private":
      return { ...gamer, visibility: PROFILE_VISIBILITY.PRIVATE };
    default:
      return gamer;
  }
}

function isOwnerOf(gamer: GamerProfile): boolean {
  return getSession()?.userId === gamer.userId;
}

// UNCONFIRMED: a private profile answers 403 to everyone but its owner.
route("GET", "/api/v1/gamers/:id", ({ params }): GamerProfile => {
  if (scenario() === "profile-fail") serverError();
  const gamer = withProfileScenario(findGamer(params.id));
  if (gamer.visibility === PROFILE_VISIBILITY.PRIVATE && !isOwnerOf(gamer)) {
    throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "This profile is private.");
  }
  return gamer;
});

// README §14 guard: owner, COACH (read-only), SPONSOR (summary only). Wallet for the owner only.
route("GET", "/api/v1/gamers/:id/dashboard", ({ params }): GamerDashboard => {
  if (scenario() === "dashboard-fail") serverError();
  const session = getSession();
  if (!session) throw new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  const profile = withProfileScenario(findGamer(params.id));
  const owner = isOwnerOf(profile);
  if (!owner && session.role !== ROLE.COACH && session.role !== ROLE.SPONSOR) {
    throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "You can't view this dashboard.");
  }
  const summary: GamerDashboard = {
    profile,
    radScoreHistory: [
      { date: "2026-11-07T00:00:00.000Z", radScore: profile.radScore - 260 },
      { date: "2026-11-08T00:00:00.000Z", radScore: profile.radScore - 120 },
      { date: "2026-11-09T00:00:00.000Z", radScore: profile.radScore },
    ],
  };
  if (!owner && session.role === ROLE.SPONSOR) return summary;
  const clips =
    scenario() === "profile-no-clips" ? [] : mockClips.filter((clip) => clip.ownerId === profile.id);
  if (!owner) return { ...summary, clips };
  const walletEntries = mockWalletEntries.filter((entry) => entry.userId === profile.userId);
  return {
    ...summary,
    clips,
    walletBalance: walletEntries.reduce((sum, entry) => sum + entry.amount, 0),
    walletEntries,
  };
});

// UNCONFIRMED endpoint (see updateGamerProfile). Owner only; edits the fixture for this tab.
route("PATCH", "/api/v1/gamers/:id", ({ params, body }): GamerProfile => {
  if (scenario() === "profile-update-fail") serverError();
  const gamer = findGamer(params.id);
  if (!isOwnerOf(gamer)) throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "Only the owner can edit.");
  const changes = (body ?? {}) as UpdateGamerProfileRequest;
  if (changes.visibility !== undefined) gamer.visibility = changes.visibility;
  if (changes.aiSummary !== undefined) gamer.aiSummary = changes.aiSummary;
  if (changes.aiSummaryStatus !== undefined) gamer.aiSummaryStatus = changes.aiSummaryStatus;
  if (gamer.aiSummary === null) gamer.aiSummaryStatus = undefined;
  return gamer;
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
