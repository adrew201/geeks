// API contract types for the Play2Pro backend.
// Source: README §13 (data model), §14 (API reference), §15 (money flows).
// Shapes marked "assumed" are not fully specified in the README. Confirm them
// against the Postman collection once Rabasa exports it, and update here only.
// Money is always integer cents (README §13 "Money conventions"); format with lib/format-money.ts.

/* ------------------------------------------------------------------ */
/* Enum constants: each is the single source for its values            */
/* ------------------------------------------------------------------ */

/** README role. The Prisma schema folds role+tier into GAMER_FREE/GAMER_PAID/...; confirm with Rabasa. */
export const ROLE = {
  GAMER: "GAMER",
  COACH: "COACH",
  SPONSOR: "SPONSOR",
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const TIER = {
  FREE: "FREE",
  PAID: "PAID",
} as const;
export type Tier = (typeof TIER)[keyof typeof TIER];

/**
 * Decision 1: votes are UP/DOWN only. Swipe right = UP, swipe left = DOWN.
 * README §14 uses UP/DOWN; the Prisma schema says UPVOTE/DOWNVOTE. If the API ships
 * the schema values, change them here and nowhere else.
 */
export const VOTE_DIRECTION = {
  UP: "UP",
  DOWN: "DOWN",
} as const;
export type VoteDirection = (typeof VOTE_DIRECTION)[keyof typeof VOTE_DIRECTION];

/**
 * Clip AI analysis status: the API's `aiAnalysisStatus` (Prisma AnalysisStatus). The clip
 * worker sets PROCESSING when it starts, then COMPLETED or FAILED.
 */
export const CLIP_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type ClipStatus = (typeof CLIP_STATUS)[keyof typeof CLIP_STATUS];

export const BOUNTY_TYPE = {
  CHALLENGE: "CHALLENGE",
  TOURNAMENT: "TOURNAMENT",
  DARE: "DARE",
} as const;
export type BountyType = (typeof BOUNTY_TYPE)[keyof typeof BOUNTY_TYPE];

/**
 * README §15.3 bounty statuses: the only values the app uses. The Prisma schema sends
 * OPEN_ESCROWED / EXPIRED_VOIDED and has no AWAITING_APPROVAL; toBountyStatus() in
 * features/bounties/bounty-status.ts maps those onto these. Confirm with Obonyo.
 */
export const BOUNTY_STATUS = {
  DRAFT: "DRAFT",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  OPEN: "OPEN",
  VERIFYING: "VERIFYING",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type BountyStatus = (typeof BOUNTY_STATUS)[keyof typeof BOUNTY_STATUS];

/**
 * UNCONFIRMED (ask Obonyo): entry statuses, from the Prisma SubmissionStatus enum. README §13
 * only has `confirmed` and `aiVerdict`; toSubmission() derives a status from those when the
 * API sends none.
 */
export const SUBMISSION_STATUS = {
  SUBMITTED: "SUBMITTED",
  AI_VERIFIED: "AI_VERIFIED",
  AI_REJECTED: "AI_REJECTED",
  WINNER_APPROVED: "WINNER_APPROVED",
  DECLINED: "DECLINED",
} as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

/** Decision 3: the wallet is built around these kinds (README §13 WalletEntry.kind). */
export const WALLET_ENTRY_KIND = {
  DONATION: "DONATION",
  BOUNTY: "BOUNTY",
  AD_SHARE: "AD_SHARE",
  WITHDRAWAL: "WITHDRAWAL",
  FEE: "FEE",
  REVERSAL: "REVERSAL",
} as const;
export type WalletEntryKind = (typeof WALLET_ENTRY_KIND)[keyof typeof WALLET_ENTRY_KIND];

/** Assumed `plan` values for POST /subscriptions (README §9.3 plans: Paid Gamer, Coach). */
export const SUBSCRIPTION_PLAN = {
  PAID_GAMER: "PAID_GAMER",
  COACH: "COACH",
} as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];

export const COMMUNITY_MEMBER_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
} as const;
export type CommunityMemberStatus =
  (typeof COMMUNITY_MEMBER_STATUS)[keyof typeof COMMUNITY_MEMBER_STATUS];

export const COMMUNITY_DECISION = {
  APPROVE: "APPROVE",
  DECLINE: "DECLINE",
} as const;
export type CommunityDecision = (typeof COMMUNITY_DECISION)[keyof typeof COMMUNITY_DECISION];

/** README §14 error codes, plus two client-only codes. */
export const API_ERROR_CODE = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN_ROLE: "FORBIDDEN_ROLE",
  FORBIDDEN_TIER: "FORBIDDEN_TIER",
  NOT_VERIFIED_ADULT: "NOT_VERIFIED_ADULT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  PAYPAL_ERROR: "PAYPAL_ERROR",
  /** Client-only: the request never reached the API. */
  NETWORK_ERROR: "NETWORK_ERROR",
  /** Client-only: the API answered without the standard error body. */
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;
export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];

/* ------------------------------------------------------------------ */
/* Shared shapes                                                        */
/* ------------------------------------------------------------------ */

/** Integer minor units (cents). Never a float. */
export type Cents = number;
/** UTC ISO-8601 string (README §21). */
export type IsoDate = string;

export interface ApiErrorBody {
  error: { code: string; message: string };
}

/* ------------------------------------------------------------------ */
/* Auth                                                                 */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  email: string;
  role: Role;
  tier: Tier;
  isVerifiedAdult: boolean;
}

/**
 * Role values the API may send or accept. UNCONFIRMED (ask Rabasa): README §13 uses a
 * split `role` (GAMER | COACH | SPONSOR) plus `tier` (FREE | PAID); the Prisma schema has
 * one combined UserRole enum. lib/role-adapter.ts is the only place that reads or writes
 * these; the rest of the app uses ROLE and TIER.
 */
export const API_ROLE = {
  GAMER: "GAMER",
  COACH: "COACH",
  SPONSOR: "SPONSOR",
  GAMER_FREE: "GAMER_FREE",
  GAMER_PAID: "GAMER_PAID",
  ADMIN: "ADMIN",
} as const;
export type ApiRole = (typeof API_ROLE)[keyof typeof API_ROLE];

/**
 * The JWT payload as the API signs it. README §18 confirms userId, role and tier.
 * UNCONFIRMED: whether `role` is split or combined (then `tier` may be absent), and `exp`
 * (the standard JWT expiry claim; README sets JWT_EXPIRES_IN=7d).
 */
export interface RawJwtPayload {
  /** The API signs the user id as the standard `sub` claim. */
  sub?: string;
  /** Legacy name, still accepted (the mocks use it). */
  userId?: string;
  role: string;
  tier?: string;
  /** Seconds since the epoch. */
  exp?: number;
}

/** The signed-in user as the app sees it, after lib/role-adapter.ts. */
export interface JwtPayload {
  userId: string;
  role: Role;
  tier: Tier;
}

/** README §14: POST /auth/signup "Create account with role (tier starts FREE)". */
export interface SignupRequest {
  email: string;
  password: string;
  /** Required by the API (1-60 characters). */
  displayName: string;
  /** Sent in whichever format API_ROLE_FORMAT selects (lib/role-adapter.ts). */
  role: ApiRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * UNCONFIRMED: README only says login "Returns JWT". We read `token` and nothing else;
 * role and tier come from the token payload. The signup response is not documented at
 * all; if it carries no token, the client logs in with the same credentials.
 */
export interface AuthResponse {
  token: string;
}

/* ------------------------------------------------------------------ */
/* Gamer ID / profile                                                   */
/* ------------------------------------------------------------------ */

/** README §10 skill summary job output. */
export interface AiSkillSummary {
  summary: string;
  strengths: string[];
  roles: string[];
}

/**
 * UNCONFIRMED (ask Rabasa): profile visibility. Pages 06/12 have a Public/Private toggle and
 * a "Restricted Access" state, but README §13 GamerProfile has no visibility field. The UI
 * shows the toggle and the PUBLIC/PRIVATE badge only when the API sends this field.
 */
export const PROFILE_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
} as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[keyof typeof PROFILE_VISIBILITY];

/**
 * UNCONFIRMED (ask Rabasa): owner review of the AI skill summary (06D Accept / Reject / Edit).
 * README §10 only says the job writes `aiSummary`. Assumed: a new summary starts
 * PENDING_REVIEW and is public once ACCEPTED. A missing field is treated as ACCEPTED.
 */
export const AI_SUMMARY_STATUS = {
  PENDING_REVIEW: "PENDING_REVIEW",
  ACCEPTED: "ACCEPTED",
} as const;
export type AiSummaryStatus = (typeof AI_SUMMARY_STATUS)[keyof typeof AI_SUMMARY_STATUS];

/**
 * Public Gamer ID: GET /api/v1/gamers/:id. Fields per README §13 GamerProfile.
 * UNCONFIRMED: which id `:id` takes. The app links with `id`, but /passport only knows the
 * JWT `userId` (README §18), so features/profile/api.ts assumes the route also accepts a
 * userId. Alternatives to ask for: `gamerId` in the JWT, or GET /gamers/me.
 * UNCONFIRMED: a private profile is assumed to answer 403 to anyone but the owner.
 */
export interface GamerProfile {
  id: string;
  userId: string;
  gamerTags: string[];
  platforms: string[];
  games: string[];
  region: string | null;
  aiSummary: AiSkillSummary | null;
  radScore: number;
  /** UNCONFIRMED: not in README §13 (see PROFILE_VISIBILITY). */
  visibility?: ProfileVisibility;
  /** UNCONFIRMED: not in README §13 (see AI_SUMMARY_STATUS). */
  aiSummaryStatus?: AiSummaryStatus;
  /**
   * UNCONFIRMED (ask Rabasa): README §18 says receiving donations needs `isVerifiedAdult`,
   * but that flag lives on User and the public Gamer ID doesn't expose it. When the API sends
   * `false` the donate button is replaced by a "can't receive donations yet" note; when the
   * field is missing the button shows and POST /donations' 403 NOT_VERIFIED_ADULT is handled.
   */
  isVerifiedAdult?: boolean;
}

/**
 * UNCONFIRMED body for a profile update. README §14 has no write route for GamerProfile, so
 * PATCH /api/v1/gamers/:id is assumed (features/profile/api.ts). Used by the 06D owner
 * actions: visibility toggle, and accept / reject / edit of the AI summary.
 */
export interface UpdateGamerProfileRequest {
  visibility?: ProfileVisibility;
  aiSummary?: AiSkillSummary | null;
  aiSummaryStatus?: AiSummaryStatus;
}

/**
 * UNCONFIRMED: GET /api/v1/gamers/:id/dashboard. README §14 only says "Stats for AG Charts",
 * guarded owner / COACH (read-only) / SPONSOR (summary only); §18 adds "plus wallet" for
 * the owner. Assumed: one envelope for all three; SPONSOR gets it without `clips` and
 * without the wallet fields, and only the owner gets the wallet fields.
 */
export interface GamerDashboard {
  profile: GamerProfile;
  radScoreHistory: Array<{ date: IsoDate; radScore: number }>;
  /** Absent for SPONSOR ("summary only"). */
  clips?: Clip[];
  walletBalance?: Cents;
  walletEntries?: WalletEntry[];
}

/* ------------------------------------------------------------------ */
/* Clips, feed, votes, ads                                              */
/* ------------------------------------------------------------------ */

export interface ClipKeyMoment {
  t: string;
  label: string;
}

/** README §10 clip analysis output, stored on Clip. */
export interface ClipStats {
  kills?: number;
  headshots?: number;
  objective?: string;
  [key: string]: string | number | undefined;
}

/**
 * A clip as the API sends it (the Prisma Clip row, e.g. the 201 body of POST /api/v1/clips).
 * Only lib/clip-adapter.ts reads this; the rest of the app uses Clip.
 */
export interface ApiClip {
  id: string;
  gamerId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  game: string;
  aiAnalysisStatus: ClipStatus | (string & {});
  aiGameDetected?: string | null;
  /** Json column; the worker writes `{ t, label }[]`. */
  aiKeyMoments?: unknown;
  aiTags?: string[];
  /** Defaults to 0 before analysis, so it only means something once COMPLETED. */
  aiQualityScore?: number | null;
  eloRating: number;
  upvoteCount?: number;
  downvoteCount?: number;
  createdAt?: IsoDate;
}

/** A clip as the app sees it, after toClip(). */
export interface Clip {
  id: string;
  ownerId: string;
  url: string;
  title: string;
  description: string;
  game: string;
  tags: string[];
  /** The worker doesn't store stats yet, so clips from the API have null. */
  stats: ClipStats | null;
  keyMoments?: ClipKeyMoment[];
  aiQualityScore: number | null;
  eloRating: number;
  status: ClipStatus;
}

/** POST /api/v1/clips body (src/plugins/clips/routes.ts). */
export interface CreateClipRequest {
  // TODO: should come from the JWT once Obonyo changes the routes. Until then it's the
  // signed-in user's id (getSession().userId); the API looks it up as a User id.
  gamerId: string;
  title: string;
  videoUrl: string;
  description?: string;
  /** Display name, e.g. "Valorant" (config/games.ts). The API defaults to "Valorant". */
  game?: string;
}

/** 201 with the created clip row; analysis is queued, so aiAnalysisStatus is PENDING. */
export type CreateClipResponse = ApiClip;

/**
 * UNCONFIRMED house-ad shape. README §19 only says "a house ad (Play2Pro promo)";
 * no fields are specified.
 */
export interface HouseAd {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

/**
 * UNCONFIRMED. README §14 only says GET /api/v1/feed?cursor= is "paged" with "ads interleaved
 * for FREE". The `kind` discriminator, the `owner` block and the ad item are all assumed.
 */
export type FeedItem = { kind: "clip"; clip: Clip; owner: FeedOwner } | { kind: "ad"; ad: HouseAd };

/** UNCONFIRMED: owner summary embedded in each feed clip (values exist on GamerProfile, README §13). */
export interface FeedOwner {
  gamerId: string;
  gamerTag: string;
  region: string | null;
  radScore: number;
}

/** UNCONFIRMED: page envelope. README §14 confirms only the `cursor` query param. */
export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

/** POST /api/v1/clips/:id/vote body (src/plugins/clips/routes.ts). The voter comes from the JWT; the body is direction only. */
export interface VoteRequest {
  direction: VoteDirection;
}

/**
 * The API answers `{ clip, radScore }`; the client ignores it. A repeat vote isn't an error
 * there (the same direction is a no-op, the other one switches the vote). The client still
 * treats 409 as "already voted" (see features/feed/api.ts) in case that changes.
 */
export type VoteResponse = unknown;

/* ------------------------------------------------------------------ */
/* Leaderboard                                                          */
/* ------------------------------------------------------------------ */

/**
 * GET /api/v1/leaderboard[?game=<name>]. Shape confirmed by Fabiola (backend on fabiola/ranking,
 * src/lib/ranking/leaderboard.ts). Public route: no JWT needed.
 * - `game` is the display name as stored on GamerProfile.primaryGame / secondaryGames
 *   (e.g. "Valorant"), matched exactly. Leave it out for the overall board.
 * - Top 50 by rad score (ties broken by Elo). The filter only narrows who appears; ranks are
 *   1..n within the filtered list and scores are the same on every board.
 * - An unknown game is not an error: it returns an empty `entries`.
 * - Private profiles (visibility false) are left out.
 * - There is no "my position" field: the app finds the caller in `entries` by gamerId.
 * Refetch after a vote to see the change.
 */
export interface LeaderboardEntry {
  rank: number;
  /** The gamer's userId; links to GET /api/v1/gamers/:id. */
  gamerId: string;
  gamerTag: string;
  displayName: string;
  avatarUrl: string | null;
  /** Display name, e.g. "Valorant". */
  primaryGame: string;
  region: string | null;
  radScore: number;
  currentElo: number;
}

export interface LeaderboardResponse {
  /** The `game` query echoed back; null for the overall board. */
  game: string | null;
  entries: LeaderboardEntry[];
}

/* ------------------------------------------------------------------ */
/* Payments (README §15)                                                */
/* ------------------------------------------------------------------ */

export interface DonationRequest {
  gamerId: string;
  amount: Cents;
}

export interface DonationResponse {
  approvalUrl: string;
  orderId: string;
}

/**
 * UNCONFIRMED (endpoint not in README §14; ask Rabasa): GET /api/v1/orders/:id, the order
 * status the /pay/return page polls. README §9.4 mentions polling order status as the demo
 * fallback for slow webhooks, but only names PayPal's own GET /v2/checkout/orders/:id, which
 * the browser must never call. Assumed: any signed-in user can read orders they created, and
 * `status` only becomes COMPLETED after the verified PAYMENT.CAPTURE.COMPLETED webhook
 * (README §15.1 step 5). Returning from PayPal is never treated as success.
 * Statuses: CREATED / APPROVED are PayPal's order statuses before capture; PENDING is a
 * capture waiting on PayPal. Unknown values are treated as pending, never as success.
 */
export const PAYMENT_ORDER_STATUS = {
  CREATED: "CREATED",
  APPROVED: "APPROVED",
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type PaymentOrderStatus = (typeof PAYMENT_ORDER_STATUS)[keyof typeof PAYMENT_ORDER_STATUS];

/**
 * UNCONFIRMED: what the order paid for. DONATION and BOUNTY are built. For BOUNTY the order is
 * intent AUTHORIZE, so COMPLETED is assumed to mean "authorization verified, funds held", not
 * captured (README §15.3).
 */
export const PAYMENT_PURPOSE = {
  DONATION: "DONATION",
  BOUNTY: "BOUNTY",
  SUBSCRIPTION: "SUBSCRIPTION",
} as const;
export type PaymentPurpose = (typeof PAYMENT_PURPOSE)[keyof typeof PAYMENT_PURPOSE];

/** UNCONFIRMED response of GET /api/v1/orders/:id. Only `orderId` and `status` are relied on. */
export interface PaymentOrder {
  orderId: string;
  status: PaymentOrderStatus | (string & {});
  /** UNCONFIRMED. */
  amount?: Cents;
  /** UNCONFIRMED. */
  purpose?: PaymentPurpose;
  /** UNCONFIRMED: recipient Gamer ID (donations). */
  gamerId?: string;
  /** UNCONFIRMED: recipient display name (donations). */
  gamerTag?: string;
  /** Subscriptions only: the plan being bought. */
  plan?: SubscriptionPlan;
  /** UNCONFIRMED. */
  createdAt?: IsoDate;
}

/**
 * UNCONFIRMED (ask Rabasa): the query PayPal sends the payer back with. PayPal appends
 * `token=<orderId>` (and `PayerID`) to the return_url and `token` to the cancel_url; the
 * backend sets both to WEB_ORIGIN (README §8.1). Assumed: return_url = /pay/return and
 * cancel_url = /pay/return?cancelled=1. `orderId` is also accepted in case the backend adds it.
 * PayerID is never read.
 */
export const PAYPAL_RETURN_PARAM = {
  ORDER_ID: "orderId",
  /** Subscriptions: PayPal returns `subscription_id` (plus `ba_token` and `token`, not used). */
  SUBSCRIPTION_ID: "subscription_id",
  TOKEN: "token",
  CANCELLED: "cancelled",
} as const;

export interface SubscriptionRequest {
  plan: SubscriptionPlan;
}

export interface SubscriptionResponse {
  approvalUrl: string;
  subscriptionId: string;
}

export interface WalletEntry {
  id: string;
  userId: string;
  /** Signed: credits positive, debits negative. */
  amount: Cents;
  kind: WalletEntryKind;
  paypalRef: string;
  createdAt: IsoDate;
}

export interface WithdrawRequest {
  amount: Cents;
}

/* ------------------------------------------------------------------ */
/* Bounties (README §15.3)                                              */
/* ------------------------------------------------------------------ */
// Endpoints (features/bounties/api.ts):
//   GET  /api/v1/bounties                    README §14, any user, open bounties
//   POST /api/v1/bounties                    README §14, verified adult
//   POST /api/v1/bounties/:id/submissions    README §14, GAMER + verified adult
//   POST /api/v1/bounties/:id/confirm        README §14, bounty creator (or coach); body UNCONFIRMED
//   GET  /api/v1/bounties/:id                UNCONFIRMED (not in README §14)
//   POST /api/v1/bounties/:id/submissions/:submissionId/reject   UNCONFIRMED (not in README §14)
// Only features/bounties/bounty-status.ts reads the Api* shapes; the rest of the app uses
// Bounty and BountySubmission.

/** README §10 bounty verification output. Advisory only: a human still confirms. */
export interface AiVerdict {
  pass: boolean;
  confidence: number;
  matchesGame: boolean;
  taskCompleted: boolean;
  looksReused: boolean;
  reason: string;
}

/**
 * UNCONFIRMED: a bounty as the API sends it. README §13 and the Prisma schema name the fields
 * differently, so both sets are optional here: README `type`, `task`, `reward` (integer
 * cents) vs schema `bountyType`, `title` + `taskDescription`, `rewardAmount` (Decimal dollars).
 */
export interface ApiBounty {
  id: string;
  creatorId: string;
  status: string;
  deadline: IsoDate;
  type?: string;
  bountyType?: string;
  title?: string;
  task?: string;
  taskDescription?: string;
  game?: string;
  reward?: Cents;
  rewardAmount?: string | number;
  communityId?: string | null;
  /** UNCONFIRMED: only on GET /bounties/:id. The creator gets every entry, a gamer only their own. */
  submissions?: ApiBountySubmission[];
}

/** UNCONFIRMED: an entry as the API sends it (README §13 fields plus Prisma BountySubmission fields). */
export interface ApiBountySubmission {
  id: string;
  gamerId: string;
  /** UNCONFIRMED display name. */
  gamerTag?: string;
  /** UNCONFIRMED: echoed from CreateSubmissionRequest. */
  clipUrl?: string;
  note?: string | null;
  // README §13
  aiVerdict?: AiVerdict | null;
  confirmed?: boolean;
  // Prisma schema
  status?: string;
  aiVerificationStatus?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  aiConfidenceScore?: number | null;
  /** The worker stores the whole verdict here as a JSON string; older rows may be plain text. */
  aiReviewNotes?: string | null;
  creatorConfirmed?: boolean;
}

/** The AI check after toSubmission(): README `aiVerdict` or the schema's score and notes. Advisory. */
export interface AiAdvice {
  pass: boolean;
  /** 0 to 1. */
  confidence: number | null;
  reason: string | null;
  /** README-only detail checks; absent when the API sends the schema shape. */
  matchesGame?: boolean;
  taskCompleted?: boolean;
  looksReused?: boolean;
}

/** An entry as the app sees it, after toSubmission(). */
export interface BountySubmission {
  id: string;
  gamerId: string;
  gamerTag: string | null;
  clipUrl: string | null;
  note: string | null;
  status: SubmissionStatus;
  ai: AiAdvice | null;
  /** The AI check failed; the creator reviews the clip without it. */
  aiFailed: boolean;
}

/** A bounty as the app sees it, after toBounty(). */
export interface Bounty {
  id: string;
  creatorId: string;
  type: BountyType;
  title: string;
  task: string;
  game: string | null;
  reward: Cents;
  deadline: IsoDate;
  status: BountyStatus;
  submissions: BountySubmission[];
}

/** README §14 body, plus `title` and `game` (UNCONFIRMED: the Prisma model requires both). */
export interface CreateBountyRequest {
  type: BountyType;
  title: string;
  task: string;
  game: string;
  reward: Cents;
  deadline: IsoDate;
}

/**
 * README §14 returns `{ approvalUrl }` (PayPal order, intent AUTHORIZE). UNCONFIRMED: `orderId`
 * and `bountyId`. Without `orderId` the client reads PayPal's `token` from the approval URL.
 */
export interface CreateBountyResponse {
  approvalUrl: string;
  orderId?: string;
  bountyId?: string;
}

/** UNCONFIRMED body (ask Obonyo): the backend creates the clip from the link. */
export interface CreateSubmissionRequest {
  clipUrl: string;
  note?: string;
}

/** UNCONFIRMED body for README §14 POST /bounties/:id/confirm: which entry wins. */
export interface ConfirmBountyRequest {
  submissionId: string;
}

/* ------------------------------------------------------------------ */
/* Coach                                                                */
/* ------------------------------------------------------------------ */

/** Assumed shape for GET /api/v1/coach/matches. */
export interface CoachMatch {
  gamerId: string;
  gamerTag: string;
  game: string;
  region: string | null;
  radScore: number;
  reason: string;
}
