import { ROLE, SUBSCRIPTION_PLAN, TIER, type Role, type SubscriptionPlan, type Tier } from "../../types/api.ts";

// The subscription tiers and what each unlocks. One place for the whole app: the /upgrade
// page renders it, and features read entitlementsFor() instead of checking role/tier.
//
// Real (enforced by the API): who may buy which plan (POST /subscriptions: GAMER → PAID_GAMER,
// COACH → COACH), tier = PAID only after PayPal's verified ACTIVATED webhook, and the donation
// fee (DONATION_FEE_BPS 5% vs DONATION_FEE_BPS_PAID_GAMER 2.5%).
// Demo values (mock, change freely): the display prices (they must match the PayPal plans
// behind PAYPAL_PLAN_ID_*) and the perk lists / recommendation limits below.

export const TIER_ID = {
  FREE_GAMER: "FREE_GAMER",
  PAID_GAMER: "PAID_GAMER",
  COACH: "COACH",
} as const;
export type TierId = (typeof TIER_ID)[keyof typeof TIER_ID];

export interface RecommendationEntitlements {
  /** How many AI talent matches the coach sees. */
  maxMatches: number;
  /** Which recommendation settings the coach may change (the rest show as locked). */
  settings: {
    game: boolean;
    region: boolean;
    minRadScore: boolean;
    sort: boolean;
  };
}

export interface Entitlements {
  /** Fee Play2Pro keeps from donations the user receives, in percent. */
  donationFeePct: number;
  adFree: boolean;
  aiClipBreakdown: boolean;
  /** Coaches only; null for gamers and sponsors. */
  recommendations: RecommendationEntitlements | null;
}

export interface TierInfo {
  id: TierId;
  name: string;
  /** Who the tier is for, shown under the name. */
  audience: string;
  /** Monthly price in cents; 0 = free. Demo value: must match the PayPal plan. */
  priceCents: number;
  /** The PayPal plan to buy, or null for the free tier. */
  plan: SubscriptionPlan | null;
  /** The account role that can hold this tier. */
  role: Role;
  /** The tier value the API reports for this plan. */
  tier: Tier;
  perks: string[];
  entitlements: Entitlements;
}

const BASIC_RECOMMENDATIONS: RecommendationEntitlements = {
  maxMatches: 3,
  settings: { game: true, region: false, minRadScore: false, sort: false },
};

export const TIERS: Record<TierId, TierInfo> = {
  FREE_GAMER: {
    id: TIER_ID.FREE_GAMER,
    name: "Free Gamer",
    audience: "Start building your Gamer ID",
    priceCents: 0,
    plan: null,
    role: ROLE.GAMER,
    tier: TIER.FREE,
    perks: ["Public Gamer ID and leaderboard rank", "Receive donations (5% platform fee)", "Enter bounties", "Ads in the Arena"],
    entitlements: { donationFeePct: 5, adFree: false, aiClipBreakdown: false, recommendations: null },
  },
  PAID_GAMER: {
    id: TIER_ID.PAID_GAMER,
    name: "Pro Gamer",
    audience: "For gamers going pro",
    priceCents: 999,
    plan: SUBSCRIPTION_PLAN.PAID_GAMER,
    role: ROLE.GAMER,
    tier: TIER.PAID,
    perks: [
      "Everything in Free",
      "Lower donation fee: 2.5% instead of 5%",
      "Ad-free Arena",
      "Full AI clip breakdown on every upload",
      "Pro badge on your Gamer ID",
    ],
    entitlements: { donationFeePct: 2.5, adFree: true, aiClipBreakdown: true, recommendations: null },
  },
  COACH: {
    id: TIER_ID.COACH,
    name: "Coach Pro",
    audience: "For coaches scouting talent",
    priceCents: 1999,
    plan: SUBSCRIPTION_PLAN.COACH,
    role: ROLE.COACH,
    tier: TIER.PAID,
    perks: [
      "Up to 12 AI talent matches (3 on a free coach account)",
      "Recommendation settings: region, minimum RAD score and sort order",
      "Filter matches by game",
      "Ad-free",
    ],
    entitlements: {
      donationFeePct: 5,
      adFree: true,
      aiClipBreakdown: true,
      recommendations: { maxMatches: 12, settings: { game: true, region: true, minRadScore: true, sort: true } },
    },
  },
};

/** The tiers shown on /upgrade, in order. */
export const TIER_ORDER: TierId[] = [TIER_ID.FREE_GAMER, TIER_ID.PAID_GAMER, TIER_ID.COACH];

/** What a signed-in user gets. Sponsors and free coaches are not a tier card but still get entitlements. */
export function entitlementsFor(user: { role: Role; tier: Tier } | null): Entitlements {
  if (!user) return TIERS.FREE_GAMER.entitlements;
  if (user.role === ROLE.COACH) {
    return user.tier === TIER.PAID
      ? TIERS.COACH.entitlements
      : { donationFeePct: 5, adFree: false, aiClipBreakdown: false, recommendations: BASIC_RECOMMENDATIONS };
  }
  if (user.role === ROLE.GAMER && user.tier === TIER.PAID) return TIERS.PAID_GAMER.entitlements;
  return TIERS.FREE_GAMER.entitlements;
}

/** The tier card the user is currently on, if any. */
export function currentTierId(user: { role: Role; tier: Tier } | null): TierId | null {
  if (!user) return null;
  if (user.role === ROLE.GAMER) return user.tier === TIER.PAID ? TIER_ID.PAID_GAMER : TIER_ID.FREE_GAMER;
  if (user.role === ROLE.COACH && user.tier === TIER.PAID) return TIER_ID.COACH;
  return null;
}

/** Why `user` can't buy `tier`, or null if they can. Mirrors the API's PLAN_FOR_ROLE. */
export function purchaseBlocker(tier: TierInfo, user: { role: Role; tier: Tier } | null): string | null {
  // Signed out: the button sends them to log in first.
  if (!tier.plan || !user || user.role === tier.role) return null;
  return tier.role === ROLE.COACH ? "For coach accounts only." : "For gamer accounts only.";
}
