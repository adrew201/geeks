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

/** README §18 JWT payload. */
export interface JwtPayload {
  userId: string;
  role: Role;
  tier: Tier;
}

export interface SignupRequest {
  email: string;
  password: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Assumed: README only says login "Returns JWT". */
export interface AuthResponse {
  token: string;
  user: User;
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

/** Public Gamer ID: GET /api/v1/gamers/:id. Fields per README §13 GamerProfile. */
export interface GamerProfile {
  id: string;
  userId: string;
  gamerTags: string[];
  platforms: string[];
  games: string[];
  region: string | null;
  aiSummary: AiSkillSummary | null;
  radScore: number;
}

/** Assumed: GET /api/v1/gamers/:id/dashboard ("stats for AG Charts"). Wallet only for the owner. */
export interface GamerDashboard {
  profile: GamerProfile;
  radScoreHistory: Array<{ date: IsoDate; radScore: number }>;
  clips: Clip[];
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

/** Assumed house-ad shape (README §19). */
export interface HouseAd {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** Assumed: README says the feed is paged with ads interleaved for FREE users. */
export type FeedItem = { kind: "clip"; clip: Clip; owner: FeedOwner } | { kind: "ad"; ad: HouseAd };

export interface FeedOwner {
  gamerId: string;
  gamerTag: string;
  region: string | null;
  radScore: number;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface VoteRequest {
  direction: VoteDirection;
}

/* ------------------------------------------------------------------ */
/* Leaderboard                                                          */
/* ------------------------------------------------------------------ */

export interface LeaderboardEntry {
  rank: number;
  gamerId: string;
  gamerTag: string;
  game: string;
  region: string | null;
  radScore: number;
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
