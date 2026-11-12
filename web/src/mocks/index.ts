// Mock API used when env.useMocks is true. Add a route here when a page needs one.
// Unknown routes reject with NOT_FOUND so missing mocks are obvious.

import { ApiError } from "../lib/api-error.ts";
import { validateDateOfBirth } from "../features/auth/validation.ts";
import { fromApiRole, toApiRole } from "../lib/role-adapter.ts";
import { getSession as getRealSession, type Session } from "../lib/session.ts";
import {
  AI_SUMMARY_STATUS,
  API_ERROR_CODE,
  BOUNTY_STATUS,
  SUBMISSION_STATUS,
  type ApiBounty,
  type ApiBountySubmission,
  type ConfirmBountyRequest,
  type CreateBountyRequest,
  type CreateBountyResponse,
  type CreateSubmissionRequest,
  PROFILE_VISIBILITY,
  ROLE,
  SUBSCRIPTION_PLAN,
  TIER,
  type SubscriptionRequest,
  type SubscriptionResponse,
  type AuthResponse,
  PAYMENT_ORDER_STATUS,
  PAYMENT_PURPOSE,
  type DonationRequest,
  type DonationResponse,
  type PaymentOrder,
  type FeedPage,
  type GamerDashboard,
  type GamerProfile,
  type LeaderboardResponse,
  type LoginRequest,
  type SignupRequest,
  type UpdateGamerProfileRequest,
  type User,
  type VoteRequest,
  type ApiClip,
  CLIP_STATUS,
  type CreateClipRequest,
  type CoachMatch,
  WALLET_ENTRY_KIND,
  type WithdrawRequest,
} from "../types/api.ts";
import {
  mockBounties,
  mockClips,
  mockCoachMatches,
  mockRadScoreHistory,
  mockGamers,
  mockHouseAd,
  mockLeaderboardEntries,
  mockAccounts,
  mockUser,
  mockWalletEntries,
} from "./fixtures.ts";

const MOCK_LATENCY_MS = 300;

/* ------------------------------ hybrid personas ------------------------------ */

/**
 * Hybrid mode (VITE_REAL_API, config/env.ts): login is real, so the session holds a real
 * user id the fixtures don't know. The mocks then treat that user as the demo persona for
 * their role, translating ids at this boundary: the real id in a request becomes the
 * persona's id, and the persona's id in a response becomes the real id. So /passport,
 * /dashboard, /wallet and "your bounties" still recognise you as the owner.
 * With mock logins (fixture ids) nothing is translated.
 */
const PERSONA_BY_ROLE: Record<Session["role"], string> = {
  GAMER: mockUser.id,
  COACH: "usr_coach_1",
  SPONSOR: "usr_sponsor_1",
};

function personaLink(): { realId: string; personaId: string } | null {
  const session = getRealSession();
  if (!session || mockAccounts.some((account) => account.id === session.userId)) return null;
  return { realId: session.userId, personaId: PERSONA_BY_ROLE[session.role] };
}

/** The session as the mock handlers see it: the persona's id in place of a real one. */
function getSession(): Session | null {
  const session = getRealSession();
  const link = personaLink();
  return session && link ? { ...session, userId: link.personaId } : session;
}

function replaceIds(value: unknown, from: string, to: string): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value).split(JSON.stringify(from)).join(JSON.stringify(to)));
}

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
 *
 * Leaderboard, signed in as gamer@play2pro.test (ShadowViper, Valorant):
 *   default                      All Games and Valorant include ShadowViper (highlighted, your
 *                                position shown); Call of Duty Mobile doesn't (not
 *                                ShadowViper's game)
 *   ?mock=leaderboard-me-outside the signed-in gamer is left out of every board (below the top 50)
 *   ?mock=leaderboard-fail       500
 *
 * Donations (any signed-in user, on a Gamer ID that isn't yours, then /pay/return):
 *   default              order is PENDING for ~6s after the first status check, then COMPLETED
 *   ?mock=donate-fail     POST /donations answers 502 PAYPAL_ERROR (order-failed state, retry)
 *   ?mock=donate-ineligible POST /donations answers 403 NOT_VERIFIED_ADULT
 *   ?mock=order-pending   the order never leaves PENDING (still-pending, polling stops at 2 min)
 *   ?mock=order-confirmed / order-failed / order-cancelled / order-expired  that status at once
 * The scenario carries over from the profile to /pay/return (approval is simulated in-app).
 * gmr_vortex has isVerifiedAdult=false, so its donate button is disabled.
 *
 * Bounties (sponsor@play2pro.test owns bty_1 and bty_2; gamer@play2pro.test enters):
 *   default             entries get an AI result ~5s after submitting; a confirmed winner is
 *                       paid out (status COMPLETED) ~6s after Confirm; a new bounty opens once
 *                       its /pay/return order completes
 *   ?mock=bounties-empty  GET /bounties returns []
 *   ?mock=bounties-fail   GET /bounties answers 500
 *   ?mock=bounty-expired  GET /bounties/:id reports EXPIRED_VOIDED (schema alias), e.g. /bounties/bty_1?mock=bounty-expired
 *   ?mock=submit-fail     POST /bounties/:id/submissions answers 500
 *   ?mock=ai-pending      every entry stays in AI checking
 *   ?mock=ai-ready        new entries get their AI result at once
 *   ?mock=confirm-fail    POST /bounties/:id/confirm answers 502 PAYPAL_ERROR
 * Mock-only assumption: POST /bounties rejects deadlines more than 72h away (README §9.5 cap).
 *
 * Dashboards (gamer@play2pro.test on /dashboard and /wallet; coach@play2pro.test on /discover):
 *   default               ShadowViper has 10 weekly rad score points and a 19-entry ledger
 *                         covering every WalletEntry kind; a withdrawal adds a WITHDRAWAL entry
 *   ?mock=dashboard-fail  GET /gamers/:id/dashboard answers 500 (also on the profile)
 *   ?mock=wallet-empty    the owner's ledger is empty (08D state C)
 *   ?mock=withdraw-ineligible  POST /wallet/withdraw answers 403 NOT_VERIFIED_ADULT
 *   ?mock=withdraw-fail   POST /wallet/withdraw answers 502 PAYPAL_ERROR
 *   ?mock=matches-empty / matches-fail  GET /coach/matches returns [] / answers 500
 *   ?mock=leaderboard-fail also fails the Discover talent grid (same endpoint)
 *
 * Clip submission (gamer@play2pro.test on /clips/new):
 *   default               the clip is queued ~2s, analysed ~3s more, then shows its AI results
 *   ?mock=clip-submit-fail POST /clips answers 500
 *   ?mock=clip-ai-fail     analysis ends FAILED
 */
type MockScenario =
  | "empty"
  | "feed-fail"
  | "vote-fail"
  | "vote-404"
  | "leaderboard-fail"
  | "leaderboard-me-outside"
  | "auth-fail"
  | "short-session"
  | "profile-fail"
  | "profile-incomplete"
  | "profile-no-ai"
  | "profile-summary-pending"
  | "profile-private"
  | "profile-no-clips"
  | "profile-update-fail"
  | "dashboard-fail"
  | "donate-fail"
  | "donate-ineligible"
  | "order-pending"
  | "order-confirmed"
  | "order-failed"
  | "order-cancelled"
  | "order-expired"
  | "bounties-empty"
  | "bounties-fail"
  | "bounty-expired"
  | "submit-fail"
  | "ai-pending"
  | "ai-ready"
  | "confirm-fail"
  | "wallet-empty"
  | "withdraw-ineligible"
  | "withdraw-fail"
  | "matches-empty"
  | "matches-fail"
  | "clip-submit-fail"
  | "clip-ai-fail";

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
  // Same rule as the API (src/plugins/auth/index.ts): displayName is required, 1-60 characters.
  const displayName = typeof request.displayName === "string" ? request.displayName.trim() : "";
  if (displayName.length < 1 || displayName.length > 60) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "Display name must be 1 to 60 characters.");
  }
  // Same rule as the API: a valid date of birth, 13 or older.
  const dobError = validateDateOfBirth(typeof request.dateOfBirth === "string" ? request.dateOfBirth : "");
  if (dobError) throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, dobError);
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

route("POST", "/api/v1/clips/:id/vote", ({ params, body }) => {
  if (scenario() === "vote-fail") serverError();
  // The real route takes direction only (voter from the JWT) and rejects extra fields.
  const direction = (body as Partial<VoteRequest> | undefined)?.direction;
  if (direction !== "UP" && direction !== "DOWN") {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "body must have required property 'direction'");
  }
  if (scenario() === "vote-404") notFound("Clip not found.");
  if (!mockClips.some((clip) => clip.id === params.id)) notFound("Clip not found.");
  if (mockVotes.has(params.id)) {
    // UNCONFIRMED: status and code for a repeat vote (see VoteResponse in types/api.ts).
    throw new ApiError(409, API_ERROR_CODE.VALIDATION_ERROR, "You already voted on this clip.");
  }
  mockVotes.add(params.id);
  return undefined;
});

/* ------------------------------ clip submission ------------------------------ */

const MOCK_CLIP_QUEUED_MS = 2_000;
const MOCK_CLIP_ANALYSIS_MS = 3_000;
/** Clips submitted in this tab, with when they were created. */
const mockSubmittedClips = new Map<string, { clip: ApiClip; createdAt: number }>();

// The real route (src/plugins/clips/routes.ts): gamerId, title and videoUrl required; 201 with
// the clip row, analysis queued.
route("POST", "/api/v1/clips", ({ body }): ApiClip => {
  requireSession();
  if (scenario() === "clip-submit-fail") serverError();
  const request = (body ?? {}) as Partial<CreateClipRequest>;
  if (!request.gamerId || !request.title || !request.videoUrl) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "gamerId, title and videoUrl are required.");
  }
  const clip: ApiClip = {
    id: `clp_new_${Date.now().toString(36)}`,
    gamerId: request.gamerId,
    title: request.title,
    description: request.description ?? null,
    videoUrl: request.videoUrl,
    game: request.game ?? "Valorant",
    aiAnalysisStatus: CLIP_STATUS.PENDING,
    aiTags: [],
    aiQualityScore: 0,
    eloRating: 1200,
  };
  mockSubmittedClips.set(clip.id, { clip, createdAt: Date.now() });
  return clip;
});

// MOCK ONLY: the real API has no GET /clips/:id (features/clips/api.ts canTrackClip).
route("GET", "/api/v1/clips/:id", ({ params }): ApiClip => {
  const entry = mockSubmittedClips.get(params.id) ?? notFound("Clip not found.");
  const elapsed = Date.now() - entry.createdAt;
  if (elapsed < MOCK_CLIP_QUEUED_MS) return entry.clip;
  if (elapsed < MOCK_CLIP_QUEUED_MS + MOCK_CLIP_ANALYSIS_MS) {
    return { ...entry.clip, aiAnalysisStatus: CLIP_STATUS.PROCESSING };
  }
  if (scenario() === "clip-ai-fail") return { ...entry.clip, aiAnalysisStatus: CLIP_STATUS.FAILED };
  return {
    ...entry.clip,
    aiAnalysisStatus: CLIP_STATUS.COMPLETED,
    aiGameDetected: entry.clip.game,
    aiKeyMoments: [
      { t: "0:04", label: "Takes first contact" },
      { t: "0:11", label: "Double kill under pressure" },
      { t: "0:19", label: "Closes out the round" },
    ],
    aiTags: ["clutch", "aim", "composure"],
    aiQualityScore: 74,
  };
});

// Fabiola's contract: public, optional `game` display name matched exactly, top 50 by rad
// score then Elo, ranks 1..n within the filtered list. An unknown game returns no entries.
route("GET", "/api/v1/leaderboard", ({ query }): LeaderboardResponse => {
  if (scenario() === "leaderboard-fail") serverError();
  const game = query.get("game") || null;
  if (scenario() === "empty") return { game, entries: [] };

  const session = getSession();
  const entries = mockLeaderboardEntries
    .filter(({ games }) => game === null || games.includes(game))
    .map(({ entry }) => entry)
    .filter((entry) => !(scenario() === "leaderboard-me-outside" && entry.gamerId === session?.userId))
    .sort((a, b) => b.radScore - a.radScore || b.currentElo - a.currentElo)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return { game, entries };
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
    radScoreHistory: mockRadScoreHistory(profile.radScore),
  };
  if (!owner && session.role === ROLE.SPONSOR) return summary;
  const clips =
    scenario() === "profile-no-clips" ? [] : mockClips.filter((clip) => clip.ownerId === profile.id);
  if (!owner) return { ...summary, clips };
  const walletEntries =
    scenario() === "wallet-empty" ? [] : mockWalletEntries.filter((entry) => entry.userId === profile.userId);
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

/* ------------------------------ wallet ------------------------------ */

// README §14: owner + verified adult. §15.4: writes a negative WITHDRAWAL entry at once; the
// payout itself is assumed to succeed in the mock (no REVERSAL is written).
route("POST", "/api/v1/wallet/withdraw", ({ body }) => {
  const session = requireSession();
  if (scenario() === "withdraw-fail") {
    throw new ApiError(502, API_ERROR_CODE.PAYPAL_ERROR, "PayPal Payouts is unavailable. Try again in a minute.");
  }
  const account = mockAccounts.find((candidate) => candidate.id === session.userId);
  const gamer = mockGamers.find((profile) => profile.userId === session.userId);
  if (scenario() === "withdraw-ineligible" || account?.isVerifiedAdult === false || gamer?.isVerifiedAdult === false) {
    throw new ApiError(403, API_ERROR_CODE.NOT_VERIFIED_ADULT, "A verified adult PayPal account is required to withdraw.");
  }
  const { amount } = (body ?? {}) as Partial<WithdrawRequest>;
  const balance = mockWalletEntries
    .filter((entry) => entry.userId === session.userId)
    .reduce((sum, entry) => sum + entry.amount, 0);
  if (!Number.isInteger(amount) || (amount ?? 0) < 100) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "Amount must be whole cents, at least 100.");
  }
  if ((amount ?? 0) > balance) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "Amount is more than your balance.");
  }
  const id = `wal_new_${Date.now().toString(36)}`;
  mockWalletEntries.push({
    id,
    userId: session.userId,
    amount: -(amount ?? 0),
    kind: WALLET_ENTRY_KIND.WITHDRAWAL,
    paypalRef: `PO-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  });
  return undefined;
});

/* ------------------------------ coach ------------------------------ */

// README §14: COACH only. Shape UNCONFIRMED (CoachMatch in types/api.ts).
route("GET", "/api/v1/coach/matches", (): CoachMatch[] => {
  const session = requireSession();
  if (session.role !== ROLE.COACH) throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "Only coaches get AI matches.");
  if (scenario() === "matches-fail") serverError();
  if (scenario() === "matches-empty") return [];
  return mockCoachMatches;
});

/* ------------------------------ payments ------------------------------ */

interface MockOrder {
  order: PaymentOrder;
  /** Epoch ms of the first status check; the default flow completes MOCK_CONFIRM_AFTER_MS later. */
  firstCheckedAt?: number;
}

const MOCK_CONFIRM_AFTER_MS = 6_000;
const mockOrders = new Map<string, MockOrder>();

// README §14: any signed-in user. README §18: the recipient must be a verified adult.
route("POST", "/api/v1/donations", ({ body }): DonationResponse => {
  if (!getSession()) throw new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  if (scenario() === "donate-fail") {
    throw new ApiError(502, API_ERROR_CODE.PAYPAL_ERROR, "PayPal is unavailable. Try again.");
  }
  const request = (body ?? {}) as Partial<DonationRequest>;
  const gamer = findGamer(String(request.gamerId ?? ""));
  if (scenario() === "donate-ineligible" || gamer.isVerifiedAdult === false) {
    throw new ApiError(
      403,
      API_ERROR_CODE.NOT_VERIFIED_ADULT,
      "This gamer needs a verified adult PayPal account to receive donations.",
    );
  }
  if (!Number.isInteger(request.amount) || (request.amount ?? 0) < 100) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "Amount must be whole cents, at least 100.");
  }
  const orderId = `MOCK-ORDER-${mockOrders.size + 1}-${Date.now().toString(36).toUpperCase()}`;
  mockOrders.set(orderId, {
    order: {
      orderId,
      status: PAYMENT_ORDER_STATUS.CREATED,
      amount: request.amount,
      purpose: PAYMENT_PURPOSE.DONATION,
      gamerId: gamer.id,
      gamerTag: gamer.gamerTags[0],
      createdAt: new Date().toISOString(),
    },
  });
  return { approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`, orderId };
});

const ORDER_SCENARIO_STATUS: Partial<Record<MockScenario, PaymentOrder["status"]>> = {
  "order-pending": PAYMENT_ORDER_STATUS.APPROVED,
  "order-confirmed": PAYMENT_ORDER_STATUS.COMPLETED,
  "order-failed": PAYMENT_ORDER_STATUS.FAILED,
  "order-cancelled": PAYMENT_ORDER_STATUS.CANCELLED,
  "order-expired": PAYMENT_ORDER_STATUS.EXPIRED,
};

// UNCONFIRMED endpoint (see PaymentOrder). Orders made in another tab or before a reload are
// unknown to the mock; MOCK-ORDER-* ids are re-created as a $10 donation so /pay/return still works.
route("GET", "/api/v1/orders/:id", ({ params }): PaymentOrder => {
  if (!getSession()) throw new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  let entry = mockOrders.get(params.id);
  if (!entry) {
    if (!params.id.startsWith("MOCK-ORDER-")) notFound("Order not found.");
    entry = {
      order: {
        orderId: params.id,
        status: PAYMENT_ORDER_STATUS.CREATED,
        amount: 1000,
        purpose: PAYMENT_PURPOSE.DONATION,
      },
    };
    mockOrders.set(params.id, entry);
  }
  entry.firstCheckedAt ??= Date.now();
  const status =
    ORDER_SCENARIO_STATUS[scenario() as MockScenario] ??
    (Date.now() - entry.firstCheckedAt >= MOCK_CONFIRM_AFTER_MS
      ? PAYMENT_ORDER_STATUS.COMPLETED
      : PAYMENT_ORDER_STATUS.APPROVED);
  // Bounty funding: the verified authorization opens the bounty (README §15.3).
  const bountyId = mockBountyOrders.get(params.id);
  if (bountyId && status === PAYMENT_ORDER_STATUS.COMPLETED) findBounty(bountyId).status = BOUNTY_STATUS.OPEN;
  // Subscriptions: the (mock) ACTIVATED webhook makes the account PAID.
  if (entry.order.purpose === PAYMENT_PURPOSE.SUBSCRIPTION && status === PAYMENT_ORDER_STATUS.COMPLETED) {
    const account = mockAccounts.find((a) => a.id === getSession()?.userId);
    if (account) account.tier = TIER.PAID;
  }
  return { ...entry.order, status };
});

// POST /api/v1/subscriptions (Rabasa). Same rules as the API: GAMER buys PAID_GAMER, COACH buys
// COACH, one open subscription at a time. Subscription ids look like PayPal's ("I-…").
route("POST", "/api/v1/subscriptions", ({ body }): SubscriptionResponse => {
  const session = getSession();
  if (!session) throw new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  const plan = (body as Partial<SubscriptionRequest> | undefined)?.plan;
  const allowed = session.role === ROLE.GAMER ? SUBSCRIPTION_PLAN.PAID_GAMER : session.role === ROLE.COACH ? SUBSCRIPTION_PLAN.COACH : null;
  if (!plan || plan !== allowed) throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "Your account type can't buy this plan.");
  if (session.tier === TIER.PAID) throw new ApiError(409, API_ERROR_CODE.VALIDATION_ERROR, "You already have an active subscription.");
  const subscriptionId = `I-MOCK${mockOrders.size + 1}${Date.now().toString(36).toUpperCase()}`;
  mockOrders.set(subscriptionId, {
    order: {
      orderId: subscriptionId,
      status: PAYMENT_ORDER_STATUS.PENDING,
      purpose: PAYMENT_PURPOSE.SUBSCRIPTION,
      plan,
      createdAt: new Date().toISOString(),
    },
  });
  return { approvalUrl: `https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=${subscriptionId}`, subscriptionId };
});

// GET /auth/me: fresh token with the account's current role/tier (used after a subscription).
route("GET", "/auth/me", (): AuthResponse => {
  const session = getSession();
  if (!session) throw new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  const account: User = mockAccounts.find((a) => a.id === session.userId) ?? {
    id: session.userId,
    email: "",
    role: session.role,
    tier: session.tier,
    isVerifiedAdult: false,
  };
  return { token: mockToken(account) };
});

/* ------------------------------ bounties ------------------------------ */

const MOCK_AI_AFTER_MS = 5_000;
const MOCK_PAYOUT_AFTER_MS = 6_000;
const MOCK_DEADLINE_CAP_MS = 72 * 3_600_000;
/** Entry id → when its AI result appears (entries made in this tab). */
const mockAiReadyAt = new Map<string, number>();
/** Bounty id → when the backend "finishes" capture + payout after Confirm. */
const mockPayoutAt = new Map<string, number>();
/** Order id → bounty it funds. */
const mockBountyOrders = new Map<string, string>();

const OPEN_STATUSES: string[] = [BOUNTY_STATUS.OPEN, "OPEN_ESCROWED", BOUNTY_STATUS.VERIFYING];

function requireSession(): Session {
  const session = getSession();
  if (!session) throw new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to continue.");
  return session;
}

function findBounty(id: string): ApiBounty {
  return mockBounties.find((bounty) => bounty.id === id) ?? notFound("Bounty not found.");
}

function requireCreator(bounty: ApiBounty): void {
  if (requireSession().userId !== bounty.creatorId) {
    throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "Only the bounty's creator can do this.");
  }
}

/** What GET returns for an entry right now: hides the AI result until it's "ready". */
function entryView(entry: ApiBountySubmission): ApiBountySubmission {
  const readyAt = mockAiReadyAt.get(entry.id);
  const pending =
    scenario() === "ai-pending" ||
    (scenario() !== "ai-ready" && readyAt !== undefined && Date.now() < readyAt);
  if (!pending || entry.confirmed || entry.status === SUBMISSION_STATUS.DECLINED) return entry;
  return { ...entry, aiVerdict: null, status: SUBMISSION_STATUS.SUBMITTED, aiVerificationStatus: "PROCESSING" };
}

route("GET", "/api/v1/bounties", (): ApiBounty[] => {
  if (scenario() === "bounties-fail") serverError();
  if (scenario() === "bounties-empty") return [];
  // README §14: open bounties only. Entries are not part of the list.
  return mockBounties
    .filter((bounty) => OPEN_STATUSES.includes(bounty.status))
    .map((bounty) => ({ ...bounty, submissions: undefined }));
});

// UNCONFIRMED endpoint. The creator sees every entry; anyone else only their own.
route("GET", "/api/v1/bounties/:id", ({ params }): ApiBounty => {
  const session = requireSession();
  const bounty = findBounty(params.id);
  const payoutAt = mockPayoutAt.get(bounty.id);
  if (payoutAt !== undefined && Date.now() >= payoutAt) bounty.status = BOUNTY_STATUS.COMPLETED;
  const entries = (bounty.submissions ?? [])
    .filter((entry) => session.userId === bounty.creatorId || entry.gamerId === session.userId)
    .map(entryView);
  const status = scenario() === "bounty-expired" ? "EXPIRED_VOIDED" : bounty.status;
  return { ...bounty, status, submissions: entries };
});

// README §14: verified adult. Sponsor-only in this app (decision 7).
route("POST", "/api/v1/bounties", ({ body }): CreateBountyResponse => {
  const session = requireSession();
  if (session.role !== ROLE.SPONSOR) throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "Only sponsors can create bounties.");
  const request = (body ?? {}) as Partial<CreateBountyRequest>;
  const deadline = Date.parse(String(request.deadline));
  if (!request.title || !request.task || !Number.isInteger(request.reward) || Number.isNaN(deadline)) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "Title, task, reward and deadline are required.");
  }
  if (deadline - Date.now() > MOCK_DEADLINE_CAP_MS) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "The deadline must be within 72 hours.");
  }
  const id = `bty_new_${mockBounties.length + 1}`;
  mockBounties.push({
    id,
    creatorId: session.userId,
    type: request.type,
    title: request.title,
    task: request.task,
    game: request.game,
    reward: request.reward,
    deadline: new Date(deadline).toISOString(),
    status: BOUNTY_STATUS.AWAITING_APPROVAL,
    submissions: [],
  });
  const orderId = `MOCK-ORDER-${mockOrders.size + 1}-${Date.now().toString(36).toUpperCase()}`;
  mockOrders.set(orderId, {
    order: {
      orderId,
      status: PAYMENT_ORDER_STATUS.CREATED,
      amount: request.reward,
      purpose: PAYMENT_PURPOSE.BOUNTY,
      createdAt: new Date().toISOString(),
    },
  });
  mockBountyOrders.set(orderId, id);
  return { approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`, orderId, bountyId: id };
});

// README §14: GAMER + verified adult. Body UNCONFIRMED ({ clipUrl, note? }).
route("POST", "/api/v1/bounties/:id/submissions", ({ params, body }): ApiBountySubmission => {
  const session = requireSession();
  if (scenario() === "submit-fail") serverError();
  if (session.role !== ROLE.GAMER) throw new ApiError(403, API_ERROR_CODE.FORBIDDEN_ROLE, "Only gamers can enter bounties.");
  const bounty = findBounty(params.id);
  if (!OPEN_STATUSES.includes(bounty.status)) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "This bounty isn't taking entries.");
  }
  const request = (body ?? {}) as Partial<CreateSubmissionRequest>;
  if (!request.clipUrl?.startsWith("https://")) {
    throw new ApiError(400, API_ERROR_CODE.VALIDATION_ERROR, "Send a valid https clip link.");
  }
  bounty.submissions ??= [];
  if (bounty.submissions.some((entry) => entry.gamerId === session.userId)) {
    throw new ApiError(409, API_ERROR_CODE.VALIDATION_ERROR, "You already entered this bounty.");
  }
  const gamer = mockGamers.find((profile) => profile.userId === session.userId);
  const entry: ApiBountySubmission = {
    id: `sub_new_${Date.now().toString(36)}`,
    gamerId: session.userId,
    gamerTag: gamer?.gamerTags[0],
    clipUrl: request.clipUrl,
    note: request.note ?? null,
    aiVerdict: {
      pass: true,
      confidence: 0.82,
      matchesGame: true,
      taskCompleted: true,
      looksReused: false,
      reason: "The clip appears to show the task being completed in one take.",
    },
    confirmed: false,
  };
  bounty.submissions.push(entry);
  mockAiReadyAt.set(entry.id, Date.now() + MOCK_AI_AFTER_MS);
  return entryView(entry);
});

// README §14: bounty creator (or coach). Body UNCONFIRMED. Capture + payout finish later.
route("POST", "/api/v1/bounties/:id/confirm", ({ params, body }) => {
  const bounty = findBounty(params.id);
  requireCreator(bounty);
  if (scenario() === "confirm-fail") {
    throw new ApiError(502, API_ERROR_CODE.PAYPAL_ERROR, "PayPal couldn't capture the held funds. Try again.");
  }
  const { submissionId } = (body ?? {}) as Partial<ConfirmBountyRequest>;
  const entry = bounty.submissions?.find((candidate) => candidate.id === submissionId) ?? notFound("Entry not found.");
  entry.confirmed = true;
  entry.status = SUBMISSION_STATUS.WINNER_APPROVED;
  bounty.status = BOUNTY_STATUS.VERIFYING;
  mockPayoutAt.set(bounty.id, Date.now() + MOCK_PAYOUT_AFTER_MS);
  return undefined;
});

// UNCONFIRMED endpoint.
route("POST", "/api/v1/bounties/:id/submissions/:submissionId/reject", ({ params }) => {
  const bounty = findBounty(params.id);
  requireCreator(bounty);
  const entry = bounty.submissions?.find((candidate) => candidate.id === params.submissionId) ?? notFound("Entry not found.");
  entry.status = SUBMISSION_STATUS.DECLINED;
  return undefined;
});

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
  const link = personaLink();
  const [rawPath = "", search = ""] = url.split("?");
  const path = link
    ? rawPath
        .split("/")
        .map((segment) => (decodeURIComponent(segment) === link.realId ? encodeURIComponent(link.personaId) : segment))
        .join("/")
    : rawPath;
  if (link) body = replaceIds(body, link.realId, link.personaId);
  for (const candidate of routes) {
    if (candidate.method !== method) continue;
    const match = candidate.pattern.exec(path);
    if (!match) continue;
    const params = Object.fromEntries(
      candidate.keys.map((key, index) => [key, decodeURIComponent(match[index + 1] ?? "")]),
    );
    const result = candidate.handler({ params, query: new URLSearchParams(search), body });
    if (result === undefined) return undefined as T;
    return (link ? replaceIds(result, link.personaId, link.realId) : structuredClone(result)) as T;
  }
  return notFound(`No mock for ${method} ${path}. Add one in src/mocks/index.ts.`);
}
