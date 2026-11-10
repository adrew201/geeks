// User-facing labels that must stay consistent across the app.

/** Decision 5: the gamer credibility score is always called "Rad Score" (README §16.2). */
export const RAD_SCORE_LABEL = "Rad Score";

/** Trust labels from the prototypes (01D, 06D, 09D, 11D, 12D). Display-only. */
export const TRUST_LABELS = {
  "self-reported": "Self-reported",
  community: "Community-ranked",
  ai: "AI-assessed",
  verified: "Verified",
} as const;

export type TrustLevel = keyof typeof TRUST_LABELS;

/** Display names for ROLE and TIER values (types/api.ts). */
export const ROLE_LABELS = {
  GAMER: "Gamer",
  COACH: "Coach",
  SPONSOR: "Sponsor",
} as const;

export const TIER_LABELS = {
  FREE: "Free tier",
  PAID: "Paid tier",
} as const;
