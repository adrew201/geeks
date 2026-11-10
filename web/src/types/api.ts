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

/** README §12: Clip goes PENDING → ANALYSED (schema AnalysisStatus differs; confirm with Obonyo). */
export const CLIP_STATUS = {
  PENDING: "PENDING",
  ANALYSED: "ANALYSED",
} as const;
export type ClipStatus = (typeof CLIP_STATUS)[keyof typeof CLIP_STATUS];

export const BOUNTY_TYPE = {
  CHALLENGE: "CHALLENGE",
  TOURNAMENT: "TOURNAMENT",
  DARE: "DARE",
} as const;
export type BountyType = (typeof BOUNTY_TYPE)[keyof typeof BOUNTY_TYPE];

/** README §15.3 statuses (schema uses OPEN_ESCROWED / EXPIRED_VOIDED; confirm with Obonyo). */
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
  userId: string;
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

export interface Clip {
  id: string;
  ownerId: string;
  url: string;
  description: string;
  game: string;
  tags: string[];
  stats: ClipStats | null;
  keyMoments?: ClipKeyMoment[];
  aiQualityScore: number | null;
  eloRating: number;
  status: ClipStatus;
}

export interface CreateClipRequest {
  url: string;
  description: string;
  game: string;
}

/** README §14 example: 202 { id, status: "PENDING" }. */
export interface CreateClipResponse {
  id: string;
  status: ClipStatus;
}

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

/** README §14: POST /api/v1/clips/:id/vote body `{ "direction": "UP" | "DOWN" }`. */
export interface VoteRequest {
  direction: VoteDirection;
}

/**
 * UNCONFIRMED: README gives no response body for a vote, so the client ignores it.
 * Vote is unique on (clipId, voterId) (README §13); the status code for a repeat vote is
 * also unconfirmed. The client treats 409 as "already voted" (see features/feed/api.ts).
 */
export type VoteResponse = unknown;

/* ------------------------------------------------------------------ */
/* Leaderboard                                                          */
/* ------------------------------------------------------------------ */

/**
 * UNCONFIRMED row shape for GET /api/v1/leaderboard?game= (README §14: "Gamers ranked by
 * rad score"). Values come from GamerProfile (README §13); the row layout is assumed.
 * README has no trend, period or region filter for the leaderboard.
 */
export interface LeaderboardEntry {
  rank: number;
  gamerId: string;
  /** UNCONFIRMED: needed to find the signed-in user's row (JWT carries userId, not gamerId). */
  userId: string;
  gamerTag: string;
  game: string;
  region: string | null;
  radScore: number;
}

/** UNCONFIRMED: assumed to be a bare array, not wrapped in an envelope. */
export type LeaderboardResponse = LeaderboardEntry[];

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

export interface Bounty {
  id: string;
  creatorId: string;
  type: BountyType;
  task: string;
  reward: Cents;
  deadline: IsoDate;
  status: BountyStatus;
  communityId?: string | null;
}

export interface CreateBountyRequest {
  type: BountyType;
  task: string;
  reward: Cents;
  deadline: IsoDate;
  communityId?: string;
}

export interface CreateBountyResponse {
  approvalUrl: string;
}

/** README §10 bounty verification output (advisory). */
export interface AiVerdict {
  pass: boolean;
  confidence: number;
  matchesGame: boolean;
  taskCompleted: boolean;
  looksReused: boolean;
  reason: string;
}

export interface BountySubmission {
  id: string;
  bountyId: string;
  gamerId: string;
  clipId: string;
  aiVerdict: AiVerdict | null;
  confirmed: boolean;
}

export interface CreateSubmissionRequest {
  clipId: string;
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
