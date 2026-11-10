import { SkipForward, TriangleAlert } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { cn } from "../../lib/cn.ts";
import type { VoteDirection } from "../../types/api.ts";
import type { VoteState } from "./use-feed.ts";
import { OPTION_TONE, SELECTABLE_STATUSES, VOTE_OPTIONS, submitButtonContent } from "./vote-options.ts";

export interface VotePanelProps {
  vote: VoteState;
  /** False when there's no clip to vote on (loading, empty, unavailable feed, house ad). */
  hasClip: boolean;
  onSelect: (direction: VoteDirection) => void;
  onSubmit: (direction: VoteDirection) => void;
  onNext: () => void;
}

function useVoteControls({ vote, hasClip }: Pick<VotePanelProps, "vote" | "hasClip">) {
  const canSelect = hasClip && SELECTABLE_STATUSES.includes(vote.status);
  const canSubmit = canSelect && vote.direction !== null && vote.status !== "idle";
  return { canSelect, canSubmit, submit: submitButtonContent(vote.status) };
}

function VoteError({ vote }: { vote: VoteState }) {
  if (vote.status !== "failed") return null;
  // 09D #error-msg copy, verbatim.
  return (
    <p role="alert" className="flex items-center gap-1 text-11 text-danger">
      <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
      We couldn't submit your vote. Please try again.
    </p>
  );
}

/** 09D "SECTION D: VOTING CARD", reduced to UP/DOWN (decision 1). */
export function DesktopVotePanel({ vote, hasClip, onSelect, onSubmit, onNext }: VotePanelProps) {
  const { canSelect, canSubmit, submit } = useVoteControls({ vote, hasClip });
  const SubmitIcon = submit.icon;

  return (
    <Card as="section" aria-labelledby="vote-panel-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="vote-panel-title" className="text-15 font-bold">
            Rate this gameplay
          </h2>
          <p className="text-11 text-fg-muted">Submit your objective evaluation to help surface talent.</p>
        </div>
        {vote.status === "already-voted" && <Badge tone="amber">Already voted</Badge>}
      </div>

      {/* 09D .vote-options-grid / .vote-option-card */}
      <div role="group" aria-label="Your vote" className="grid grid-cols-2 gap-3">
        {VOTE_OPTIONS.map(({ direction, label, hint, icon: Icon, swipeHint }) => {
          const selected = vote.direction === direction && vote.status !== "idle";
          return (
            <button
              key={direction}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} (${swipeHint})`}
              disabled={!canSelect}
              onClick={() => onSelect(direction)}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border px-3 py-4 text-center transition-all duration-200 ease-[ease] disabled:cursor-not-allowed",
                selected
                  ? OPTION_TONE[direction].selected
                  : "border-border bg-inset hover:not-disabled:border-border-light hover:not-disabled:bg-surface-hover",
                !canSelect && !selected && "opacity-60",
              )}
            >
              <Icon className={cn("size-5", OPTION_TONE[direction].text)} aria-hidden="true" />
              <span className={cn("text-13 font-bold", OPTION_TONE[direction].text)}>{label}</span>
              <span className="text-10 text-fg-muted">{hint}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button
          className="flex-1"
          disabled={!canSubmit}
          loading={vote.status === "submitting"}
          onClick={() => vote.direction && onSubmit(vote.direction)}
        >
          {SubmitIcon && <SubmitIcon className="size-3.5" aria-hidden="true" />}
          {submit.label}
        </Button>
        <Button variant="secondary" disabled={!hasClip || vote.status === "submitting"} onClick={onNext}>
          <SkipForward className="size-3.5" aria-hidden="true" />
          Skip
        </Button>
      </div>

      <VoteError vote={vote} />
    </Card>
  );
}

/** 09M .card-m voting controls: compact option buttons and a full-width submit. */
export function MobileVotePanel({ vote, hasClip, onSelect, onSubmit, onNext }: VotePanelProps) {
  const { canSelect, canSubmit, submit } = useVoteControls({ vote, hasClip });
  const SubmitIcon = submit.icon;

  return (
    <Card as="section" padding="sm" aria-labelledby="vote-panel-title-m">
      <div className="flex items-center justify-between gap-2">
        <h2 id="vote-panel-title-m" className="text-12 font-bold">
          Rate Gameplay
        </h2>
        {vote.status === "already-voted" && (
          <Badge tone="amber" size="sm">
            Already voted
          </Badge>
        )}
      </div>

      {/* 09M .vote-grid-m / .vote-btn-m */}
      <div role="group" aria-label="Your vote" className="grid grid-cols-2 gap-2">
        {VOTE_OPTIONS.map(({ direction, label, icon: Icon, swipeHint }) => {
          const selected = vote.direction === direction && vote.status !== "idle";
          return (
            <button
              key={direction}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} (${swipeHint})`}
              disabled={!canSelect}
              onClick={() => onSelect(direction)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-8 border bg-inset px-1 py-2.5 text-11 transition-all duration-200 ease-[ease] disabled:cursor-not-allowed",
                selected ? cn(OPTION_TONE[direction].selected, OPTION_TONE[direction].text) : "border-border",
                !canSelect && !selected && "opacity-60",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <Button
        fullWidth
        disabled={!canSubmit}
        loading={vote.status === "submitting"}
        onClick={() => vote.direction && onSubmit(vote.direction)}
      >
        {SubmitIcon && <SubmitIcon className="size-3.5" aria-hidden="true" />}
        {submit.label}
      </Button>

      {/* 09M has no Skip. A voter who already voted needs a way to the next clip. */}
      {vote.status === "already-voted" && (
        <Button variant="secondary" fullWidth onClick={onNext}>
          <SkipForward className="size-3.5" aria-hidden="true" />
          Next clip
        </Button>
      )}

      <VoteError vote={vote} />
    </Card>
  );
}
