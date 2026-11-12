import { CircleAlert, SkipForward, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { cn } from "../../lib/cn.ts";
import { VOTE_DIRECTION, type VoteDirection } from "../../types/api.ts";
import type { VoteState } from "./use-feed.ts";
import { SELECTABLE_STATUSES } from "./vote-options.ts";

// Desktop arena controls, floating over the full-screen reel. Left arrow = Needs Work (DOWN),
// right arrow = Impressive (UP), matching the swipe direction. One click submits the vote.
// Skip (or Next clip after a vote) sits at the bottom. Status and errors appear at the top.

export interface FloatingVoteProps {
  vote: VoteState;
  /** False when there's no clip to vote on (loading, empty, unavailable feed, house ad). */
  hasClip: boolean;
  onSubmit: (direction: VoteDirection) => void;
  onNext: () => void;
}

const ARROWS = [
  { direction: VOTE_DIRECTION.DOWN, label: "Needs Work", icon: ThumbsDown, side: "left-6", tone: "hover:border-warning hover:text-warning" },
  { direction: VOTE_DIRECTION.UP, label: "Impressive", icon: ThumbsUp, side: "right-6", tone: "hover:border-success hover:text-success" },
] as const;

export function FloatingVote({ vote, hasClip, onSubmit, onNext }: FloatingVoteProps) {
  const canVote = hasClip && SELECTABLE_STATUSES.includes(vote.status);
  const submitting = vote.status === "submitting";

  return (
    <>
      {/* Top status line: only shown when there is something to say. */}
      <div className="pointer-events-none absolute inset-x-0 top-5 z-30 flex justify-center px-4">
        {vote.status === "already-voted" && <Badge tone="amber">Already voted</Badge>}
        {vote.status === "submitting" && <Badge tone="blue">Submitting…</Badge>}
        {vote.status === "submitted" && <Badge tone="green">Vote submitted</Badge>}
      </div>

      {ARROWS.map(({ direction, label, icon: Icon, side, tone }) => (
        <button
          key={direction}
          type="button"
          aria-label={label}
          title={label}
          disabled={!canVote}
          onClick={() => onSubmit(direction)}
          className={cn(
            "absolute top-1/2 z-30 flex size-16 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-white/20 bg-bg/70 text-fg backdrop-blur-[6px] transition-colors duration-200 ease-[ease] disabled:cursor-not-allowed disabled:opacity-40",
            side,
            canVote && tone,
          )}
        >
          <Icon className="size-7" aria-hidden="true" />
        </button>
      ))}

      {/* Bottom: error, then Skip (or Next clip once voted). */}
      <div className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-3 px-4">
        {vote.status === "failed" && (
          <p role="alert" className="flex items-center gap-1.5 rounded-full bg-bg/80 px-3 py-1.5 text-12 text-danger">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            We couldn&apos;t submit your vote. Please try again.
          </p>
        )}
        {vote.status === "unavailable" && (
          <p className="flex items-center gap-1.5 text-12 text-fg-secondary">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            This clip is unavailable
          </p>
        )}
        <Button
          variant="secondary"
          disabled={!hasClip || submitting}
          onClick={onNext}
          className="bg-bg/70 backdrop-blur-[6px]"
        >
          <SkipForward className="size-3.5" aria-hidden="true" />
          {vote.status === "already-voted" ? "Next clip" : "Skip"}
        </Button>
      </div>
    </>
  );
}
