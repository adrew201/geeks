import { useEffect, useId, type ComponentProps, type ReactNode } from "react";
import { Crosshair, Gamepad2, ThumbsDown, ThumbsUp } from "lucide-react";
import { gamerProfilePath } from "../../components/layout/nav-config.ts";
import { Avatar } from "../../components/ui/Avatar.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { ButtonLink } from "../../components/ui/Button.tsx";
import { TrustBadge } from "../../components/ui/TrustBadge.tsx";
import { cn } from "../../lib/cn.ts";
import type { Clip, FeedOwner, VoteDirection } from "../../types/api.ts";
import type { VoteStatus } from "./use-feed.ts";
import { useSwipe } from "./use-swipe.ts";
import { SWIPE_INSTRUCTIONS } from "./vote-options.ts";

export type FeedVariant = "screen" | "desktop" | "mobile";

// Desktop = 09D .gameplay-reel-card: 420×640, inset bg, border, radius-xl, shadow-card.
// Mobile  = 09M .mobile-reel-viewport: full width × 420, radius-lg, border, 14px padding.
const FRAME: Record<FeedVariant, string> = {
  // Full screen: fills the arena area; the vote arrows float over it (FloatingVote.tsx).
  screen: "h-full w-full rounded-none bg-inset",
  desktop:
    "h-[640px] w-[420px] shrink-0 rounded-xl bg-inset shadow-card",
  mobile: "h-[420px] w-full rounded-lg border border-border bg-thumb-gradient p-3.5",
};

export interface ReelFrameProps extends ComponentProps<"section"> {
  variant: FeedVariant;
}

/** The reel's outer box. Also hosts the loading / empty / unavailable panels. */
export function ReelFrame({ variant, className, ...rest }: ReelFrameProps) {
  return (
    <section
      className={cn("relative flex flex-col justify-between overflow-hidden", FRAME[variant], className)}
      {...rest}
    />
  );
}

/** 09D .state-overlay-panel: covers the reel with an inset panel, centred, 24px padding. */
export function ReelOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-inset p-6">{children}</div>
  );
}

/** Decorative hints that fade in with the drag (driven by the --swipe CSS variable). */
function SwipeHints() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-16 left-5 z-[4]"
        style={{ opacity: "clamp(0, var(--swipe, 0), 1)" }}
      >
        <Badge tone="green" icon={<ThumbsUp className="size-3" />}>
          Impressive
        </Badge>
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-16 right-5 z-[4]"
        style={{ opacity: "clamp(0, calc(var(--swipe, 0) * -1), 1)" }}
      >
        <Badge tone="amber" icon={<ThumbsDown className="size-3" />}>
          Needs Work
        </Badge>
      </span>
    </>
  );
}

export interface ReelCardProps {
  variant: FeedVariant;
  clip: Clip;
  owner: FeedOwner;
  voteStatus: VoteStatus;
  /** Swipe is live only while an option can still be picked. */
  swipeEnabled: boolean;
  onSwipe: (direction: VoteDirection) => void;
  /** Rendered over the clip (the "unavailable" panel). */
  overlay?: ReactNode;
}

const SNAP_BACK_ON: VoteStatus[] = ["failed", "already-voted", "unavailable"];

export function ReelCard({ variant, clip, owner, voteStatus, swipeEnabled, onSwipe, overlay }: ReelCardProps) {
  const { bind, reset } = useSwipe<HTMLElement>({ enabled: swipeEnabled, onSwipe });
  const instructionsId = useId();

  // A swiped card flies out while the vote is in flight; bring it back unless it succeeded.
  useEffect(() => {
    if (SNAP_BACK_ON.includes(voteStatus)) reset();
  }, [voteStatus, reset]);

  return (
    <ReelFrame
      variant={variant}
      {...bind}
      aria-label={`${owner.gamerTag}: ${clip.description}`}
      aria-describedby={swipeEnabled ? instructionsId : undefined}
      className={cn("touch-pan-y select-none", swipeEnabled && "cursor-grab active:cursor-grabbing")}
    >
      <p id={instructionsId} className="sr-only">
        {SWIPE_INSTRUCTIONS}
      </p>
      {variant === "mobile" ? <MobileReel clip={clip} owner={owner} /> : <DesktopReel clip={clip} owner={owner} />}
      {swipeEnabled && <SwipeHints />}
      {overlay && <ReelOverlay>{overlay}</ReelOverlay>}
    </ReelFrame>
  );
}

function DesktopReel({ clip, owner }: { clip: Clip; owner: FeedOwner }) {
  return (
    <>
      {/* 09D:675 <!-- Simulated Gameplay Graphic Background -->
          Video playback is not implemented (docs/ui-audit.md §5c); the thumbnail gradient
          and gamepad icon stand in for the player. */}
      <div aria-hidden="true" className="absolute inset-0 z-[1] flex items-center justify-center bg-thumb-gradient">
        <Gamepad2 className="size-24 text-white/8" />
      </div>
      {/* 09D .video-overlay-gradient: dark at the top and bottom so overlay text stays legible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] bg-linear-to-b from-bg/70 via-transparent to-bg/95"
      />

      {/* 09D .reel-top-overlay. Mode ("COMPETITIVE") and duration ("00:42") have no contract field. */}
      <div className="relative z-[3] flex items-center justify-between p-5">
        <Badge tone="blue" icon={<Crosshair className="size-2.5" aria-hidden="true" />}>
          {clip.game}
        </Badge>
      </div>

      {/* 09D .reel-bottom-overlay */}
      <div className="relative z-[3] flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={owner.gamerTag} size="md" shape="tile" />
          <div className="min-w-0">
            <p className="truncate text-15 font-extrabold text-white">{owner.gamerTag}</p>
            <p className="truncate text-11 text-fg-secondary">
              ID: {owner.gamerId}
              {owner.region && ` • ${owner.region}`}
            </p>
          </div>
        </div>
        <p className="text-12 leading-[1.4] text-fg [text-shadow:0_2px_4px_rgb(0_0_0/0.8)]">
          “{clip.description}”
        </p>
        <div className="flex items-center gap-2">
          <TrustBadge level="community" size="sm" />
          <ButtonLink to={gamerProfilePath(owner.gamerId)} variant="secondary" size="sm">
            View Profile
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

/** 09M: game chip on top, gamer tag and description at the bottom. No identity row. */
function MobileReel({ clip, owner }: { clip: Clip; owner: FeedOwner }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="rounded-xs bg-black/60 px-2 py-0.5 text-10 font-bold uppercase">{clip.game}</span>
      </div>
      <div className="flex flex-col gap-1.5 [text-shadow:0_2px_4px_rgb(0_0_0/0.8)]">
        <p className="text-14 font-extrabold">{owner.gamerTag}</p>
        <p className="text-11 text-fg-secondary">“{clip.description}”</p>
      </div>
    </>
  );
}
