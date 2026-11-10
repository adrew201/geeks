import { Check, Send, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import { VOTE_DIRECTION, type VoteDirection } from "../../types/api.ts";
import type { VoteStatus } from "./use-feed.ts";

// Decision 1: two options only. The 09D "Average" option and the feedback textarea are
// dropped. Labels and colours are the 09D Impressive / Needs Work cards. Ordered DOWN, UP
// so each button sits on the side you'd swipe towards.

export interface VoteOption {
  direction: VoteDirection;
  label: string;
  /** 09D sub-label under the option name (desktop only). */
  hint: string;
  icon: LucideIcon;
  swipeHint: string;
}

export const VOTE_OPTIONS: VoteOption[] = [
  {
    direction: VOTE_DIRECTION.DOWN,
    label: "Needs Work",
    hint: "Constructive",
    icon: ThumbsDown,
    swipeHint: "swipe left",
  },
  {
    direction: VOTE_DIRECTION.UP,
    label: "Impressive",
    hint: "High Skill",
    icon: ThumbsUp,
    swipeHint: "swipe right",
  },
];

/** UP = 09D success green, DOWN = 09D status amber. Selected = tint + solid border. */
export const OPTION_TONE: Record<VoteDirection, { text: string; selected: string }> = {
  [VOTE_DIRECTION.UP]: { text: "text-success", selected: "border-success bg-success/14" },
  [VOTE_DIRECTION.DOWN]: { text: "text-warning", selected: "border-warning bg-warning/14" },
};

/** Statuses where the voter can still pick or change an option. */
export const SELECTABLE_STATUSES: VoteStatus[] = ["idle", "selected", "failed"];

/**
 * The submit button's text and icon come only from the current status, so nothing from a
 * previous state can leak (09D changed innerHTML and never reset it).
 */
export function submitButtonContent(status: VoteStatus): { label: string; icon: LucideIcon | null } {
  switch (status) {
    case "submitting":
      return { label: "Submitting…", icon: null };
    case "submitted":
      return { label: "Vote Submitted", icon: Check };
    case "already-voted":
      return { label: "Vote Recorded", icon: Check };
    default:
      return { label: "Submit Vote", icon: Send };
  }
}

export const SWIPE_INSTRUCTIONS =
  "Swipe the clip right for Impressive or left for Needs Work, or use the vote buttons.";
