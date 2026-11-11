import type { Tone } from "../../components/ui/tone-styles.ts";
import { parseMoneyToCents } from "../../lib/format-money.ts";
import {
  BOUNTY_STATUS,
  BOUNTY_TYPE,
  SUBMISSION_STATUS,
  type AiVerdict,
  type ApiBounty,
  type ApiBountySubmission,
  type Bounty,
  type BountyStatus,
  type BountySubmission,
  type BountyType,
  type Cents,
  type SubmissionStatus,
} from "../../types/api.ts";

// The only place that reads the API's bounty shapes. README §13/§15.3 and the Prisma schema
// disagree on names and values; everything is mapped onto BOUNTY_STATUS (README values) and
// the Bounty / BountySubmission types in types/api.ts.

/* ------------------------------ statuses ------------------------------ */

/** Prisma BountyStatus values that differ from README §15.3. */
const SCHEMA_STATUS_ALIASES: Record<string, BountyStatus> = {
  OPEN_ESCROWED: BOUNTY_STATUS.OPEN,
  EXPIRED_VOIDED: BOUNTY_STATUS.EXPIRED,
};

/**
 * API status → BOUNTY_STATUS. An unknown value becomes DRAFT, the one status that allows
 * nothing (no entries, no review), so a surprise from the API can never open a money action.
 */
export function toBountyStatus(raw: string): BountyStatus {
  const known = Object.values(BOUNTY_STATUS).find((status) => status === raw);
  return known ?? SCHEMA_STATUS_ALIASES[raw] ?? BOUNTY_STATUS.DRAFT;
}

/** Badge per status. DRAFT shares "awaiting funding": the schema has no AWAITING_APPROVAL. */
export const BOUNTY_STATUS_BADGE: Record<BountyStatus, { label: string; tone: Tone }> = {
  // Not page 14's "Awaiting approval" (docs/ui-audit.md §10): this is the bounty, not a payment link.
  [BOUNTY_STATUS.DRAFT]: { label: "Awaiting PayPal funding", tone: "amber" },
  [BOUNTY_STATUS.AWAITING_APPROVAL]: { label: "Awaiting PayPal funding", tone: "amber" },
  [BOUNTY_STATUS.OPEN]: { label: "Open", tone: "green" },
  [BOUNTY_STATUS.VERIFYING]: { label: "Under review", tone: "violet" },
  [BOUNTY_STATUS.COMPLETED]: { label: "Completed", tone: "blue" },
  [BOUNTY_STATUS.EXPIRED]: { label: "Expired", tone: "slate" },
  [BOUNTY_STATUS.CANCELLED]: { label: "Cancelled", tone: "slate" },
};

/** OPEN and VERIFYING take entries and reviews (README §15.3: VERIFYING sits before COMPLETED). */
export function isLive(bounty: Bounty): boolean {
  return bounty.status === BOUNTY_STATUS.OPEN || bounty.status === BOUNTY_STATUS.VERIFYING;
}

export const BOUNTY_TYPE_LABEL: Record<BountyType, string> = {
  [BOUNTY_TYPE.CHALLENGE]: "Challenge",
  [BOUNTY_TYPE.TOURNAMENT]: "Tournament",
  [BOUNTY_TYPE.DARE]: "Dare",
};

/* ------------------------------ reward ------------------------------ */

// Integer cents (decision 6). README sets no limits: client-side guards only (assumed, confirm
// with Obonyo). The API validates too. No deadline cap here: the API's error is shown.
export const REWARD_PRESETS: readonly Cents[] = [2500, 5000, 10_000, 25_000];
export const REWARD_DEFAULT: Cents = 5000;
export const REWARD_MIN: Cents = 500;
export const REWARD_MAX: Cents = 100_000;

/* ------------------------------ adapters ------------------------------ */

function toBountyType(raw: string | undefined): BountyType {
  return Object.values(BOUNTY_TYPE).find((type) => type === raw) ?? BOUNTY_TYPE.CHALLENGE;
}

/** README `reward` is integer cents; schema `rewardAmount` is a Decimal in dollars ("25.00"). */
function toReward(raw: ApiBounty): Cents {
  if (Number.isInteger(raw.reward)) return raw.reward!;
  if (raw.rewardAmount !== undefined) return parseMoneyToCents(String(raw.rewardAmount)) ?? 0;
  return 0;
}

export function toBounty(raw: ApiBounty): Bounty {
  const task = raw.task ?? raw.taskDescription ?? "";
  return {
    id: raw.id,
    creatorId: raw.creatorId,
    type: toBountyType(raw.type ?? raw.bountyType),
    title: raw.title ?? task,
    task,
    game: raw.game ?? null,
    reward: toReward(raw),
    deadline: raw.deadline,
    status: toBountyStatus(raw.status),
    submissions: (raw.submissions ?? []).map(toSubmission),
  };
}

function toSubmissionStatus(raw: ApiBountySubmission): SubmissionStatus {
  const known = Object.values(SUBMISSION_STATUS).find((status) => status === raw.status);
  if (known) return known;
  if (raw.confirmed || raw.creatorConfirmed) return SUBMISSION_STATUS.WINNER_APPROVED;
  if (raw.aiVerdict) return raw.aiVerdict.pass ? SUBMISSION_STATUS.AI_VERIFIED : SUBMISSION_STATUS.AI_REJECTED;
  return SUBMISSION_STATUS.SUBMITTED;
}

/**
 * The worker stores the full verdict in aiReviewNotes as JSON. Returns it when the notes parse
 * to a verdict with a `pass` boolean, otherwise null (plain-text notes).
 */
function parseReviewNotes(notes: string | null | undefined): AiVerdict | null {
  if (!notes) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(notes);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const v = parsed as Partial<Record<keyof AiVerdict, unknown>>;
  if (typeof v.pass !== "boolean") return null;
  return {
    pass: v.pass,
    confidence: typeof v.confidence === "number" ? v.confidence : 0,
    matchesGame: v.matchesGame === true,
    taskCompleted: v.taskCompleted === true,
    looksReused: v.looksReused === true,
    reason: typeof v.reason === "string" ? v.reason : "",
  };
}

export function toSubmission(raw: ApiBountySubmission): BountySubmission {
  const status = toSubmissionStatus(raw);
  let ai: BountySubmission["ai"] = null;
  if (raw.aiVerdict) {
    ai = { ...raw.aiVerdict };
  } else if (raw.aiVerificationStatus === "COMPLETED") {
    const verdict = parseReviewNotes(raw.aiReviewNotes);
    // Schema shape: the entry status holds pass/fail; the notes hold the verdict or plain text.
    ai = verdict
      ? { ...verdict, reason: verdict.reason || null }
      : {
          pass: status !== SUBMISSION_STATUS.AI_REJECTED,
          confidence: raw.aiConfidenceScore ?? null,
          reason: raw.aiReviewNotes ?? null,
        };
  }
  return {
    id: raw.id,
    gamerId: raw.gamerId,
    gamerTag: raw.gamerTag ?? null,
    clipUrl: raw.clipUrl ?? null,
    note: raw.note ?? null,
    status,
    ai,
    aiFailed: raw.aiVerificationStatus === "FAILED",
  };
}

/** Still waiting on the AI (no result and it hasn't failed). */
export function isAiChecking(submission: BountySubmission): boolean {
  return !submission.ai && !submission.aiFailed && submission.status === SUBMISSION_STATUS.SUBMITTED;
}

/* ------------------------------ display ------------------------------ */

const DEADLINE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Nov 11, 6:00 PM" in the viewer's time zone. */
export function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unknown" : DEADLINE_FORMAT.format(date);
}
