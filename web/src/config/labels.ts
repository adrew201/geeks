// User-facing labels that must stay consistent across the app.

/** Decision 5: the gamer credibility score is always called "Rad score" (README §16.2). */
export const RAD_SCORE_LABEL = "Rad score";

/** Trust labels from the prototypes (01D, 06D, 09D, 11D, 12D). Display-only. */
export const TRUST_LABELS = {
  "self-reported": "Self-reported",
  community: "Community-ranked",
  ai: "AI-assessed",
  verified: "Verified",
} as const;

export type TrustLevel = keyof typeof TRUST_LABELS;
