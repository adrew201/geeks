import type { ReactNode } from "react";
import { CirclePlay, Film, Play } from "lucide-react";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { EmptyState } from "../../components/ui/EmptyState.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { TrustBadge } from "../../components/ui/TrustBadge.tsx";
import { cn } from "../../lib/cn.ts";
import { CLIP_STATUS, type Clip } from "../../types/api.ts";
import { SectionHeader } from "./ProfileParts.tsx";
import { clipSource, isClipAnalysed, safeClipUrl } from "./profile-model.ts";
import type { DashboardStatus } from "./use-gamer-profile.ts";

// Gameplay evidence from GET /gamers/:id/dashboard `clips` (owner and coach only).
//   viewer = 12D SECTION G grid · owner = 06D SECTION E grid · carousel = 06M scroll-snap.
// Clips open their external link (docs/ui-audit.md §8: no player; YouTube/Twitch links).
//
// Removed (decision 3): 06D's locked "Full Match VOD + Team Comms" card with "Coach Unlock
// Fee: $5.00 via PayPal", 06M's "$5.00 PAYPAL" card, and the whole 12D/12M exclusive-footage
// card. 12D state D "No Exclusive Footage" becomes the "no evidence clips" empty state.
// Hidden (no contract field): duration tags (00:42), "Submitted 2d ago", vote counts
// ("+412 Upvotes"), the 06D "COMMUNITY VOTED" header badge and 06D "VERIFIED RESULT".

export type EvidenceVariant = "viewer" | "owner" | "carousel";

export interface EvidenceSectionProps {
  variant: EvidenceVariant;
  status: DashboardStatus;
  error: string | null;
  clips: Clip[] | null;
  onRetry: () => void;
}

export function EvidenceSection({ variant, status, error, clips, onRetry }: EvidenceSectionProps) {
  const owner = variant !== "viewer";
  const count = status === "ready" && clips ? clips.length : 0;

  let body: ReactNode;
  if (status === "loading") {
    body = <EvidenceSkeleton variant={variant} />;
  } else if (status === "error") {
    body = (
      <StatusPanel
        tone="danger"
        title="We couldn't load the gameplay clips"
        description={error ?? undefined}
        actions={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    );
  } else if (!clips || clips.length === 0) {
    body = (
      <EmptyState
        card={false}
        icon={<Film />}
        title="No evidence clips yet"
        description={
          owner
            ? "Submit a gameplay clip link and it will appear here once it's added."
            : "This gamer hasn't submitted any gameplay clips yet."
        }
        action={
          owner && (
            <ButtonLink to={ROUTES.submitGameplay} size="sm">
              Submit gameplay
            </ButtonLink>
          )
        }
      />
    );
  } else if (variant === "viewer") {
    body = (
      <ul className="grid grid-cols-3 gap-5">
        {clips.map((clip) => (
          <ViewerClipCard key={clip.id} clip={clip} />
        ))}
      </ul>
    );
  } else if (variant === "owner") {
    body = (
      <ul className="grid grid-cols-3 gap-5">
        {clips.map((clip) => (
          <OwnerClipCard key={clip.id} clip={clip} />
        ))}
      </ul>
    );
  } else {
    body = <ClipCarousel clips={clips} />;
  }

  if (variant === "carousel") {
    // 06M GAMEPLAY EVIDENCE CAROUSEL: a bare section, not a card.
    return (
      <section aria-labelledby="evidence-title" className="flex flex-col gap-2.5">
        <div className="px-1">
          <SectionHeader
            id="evidence-title"
            size="sm"
            title="Gameplay Evidence"
            aside={count > 1 && <span className="text-11 font-normal text-fg-muted">Swipe right →</span>}
          />
        </div>
        {status === "ready" && count > 0 ? body : <Card padding="none">{body}</Card>}
      </section>
    );
  }

  const countBadge = count > 0 && (
    <Badge tone="blue">
      {count} {count === 1 ? "clip" : "clips"}
    </Badge>
  );

  return (
    <Card as="section" large={variant === "viewer"} aria-labelledby="evidence-title">
      {variant === "viewer" ? (
        <SectionHeader
          id="evidence-title"
          title="Gameplay Evidence"
          subtitle="Clips submitted by the gamer"
          aside={countBadge}
        />
      ) : (
        <SectionHeader
          id="evidence-title"
          icon={<Film className="text-primary" aria-hidden="true" />}
          title="Gameplay Evidence Highlights"
          aside={countBadge}
        />
      )}
      {body}
    </Card>
  );
}

/* ------------------------------ clip cards ------------------------------ */

function clipTitle(clip: Clip): string {
  return clip.description.trim() || "Untitled clip";
}

/** An external link when the URL is http(s); otherwise a plain, non-interactive card. */
function ClipLink({ clip, className, children }: { clip: Clip; className: string; children: ReactNode }) {
  const href = safeClipUrl(clip.url);
  if (!href) return <div className={className}>{children}</div>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${clipTitle(clip)} (opens ${clipSource(clip.url) ?? "the clip"} in a new tab)`}
      className={cn(className, "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary")}
    >
      {children}
    </a>
  );
}

/** Seeded clips stay PENDING (never queued), so PENDING reads as "not yet assessed", not "pending". */
const ANALYSIS_TEXT: Record<string, string> = {
  [CLIP_STATUS.PROCESSING]: "AI analysis running",
  [CLIP_STATUS.FAILED]: "AI analysis failed",
};

function AnalysisTag({ clip, size }: { clip: Clip; size: "md" | "sm" }) {
  return isClipAnalysed(clip) ? (
    <TrustBadge level="ai" size={size} />
  ) : (
    <span className="text-10 text-fg-muted">{ANALYSIS_TEXT[clip.status] ?? "Not yet AI-assessed"}</span>
  );
}

/** 12D .clip-card: inset, radius-lg, 140px gradient thumb with a play-circle. */
function ViewerClipCard({ clip }: { clip: Clip }) {
  const source = clipSource(clip.url);
  return (
    <li>
      <ClipLink
        clip={clip}
        className="flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-border bg-inset transition-colors duration-200 hover:border-border-light"
      >
        <div className="flex h-[140px] items-center justify-center bg-thumb-gradient">
          <CirclePlay className="size-10 text-white/80" aria-hidden="true" />
        </div>
        <div className="px-3.5 pb-3.5">
          <p className="truncate text-13 font-bold">{clipTitle(clip)}</p>
          <p className="mt-0.5 text-11 text-fg-muted">{[clip.game, source].filter(Boolean).join(" • ")}</p>
          <div className="mt-2.5">
            <AnalysisTag clip={clip} size="sm" />
          </div>
        </div>
      </ClipLink>
    </li>
  );
}

/** 06D .evidence-card: inset, radius-md, 130px thumb with the round play overlay, lifts on hover. */
function OwnerClipCard({ clip }: { clip: Clip }) {
  const source = clipSource(clip.url);
  return (
    <li>
      <ClipLink
        clip={clip}
        className="block h-full overflow-hidden rounded-md border border-border bg-inset transition-[transform,border-color] duration-200 ease-[ease] hover:border-border-light motion-safe:hover:-translate-y-0.5"
      >
        <div className="flex h-[130px] items-center justify-center bg-surface-hover">
          <PlayOverlay size="md" />
        </div>
        <div className="p-4">
          <p className="mb-1.5 truncate text-14 font-bold">{clipTitle(clip)}</p>
          <p className="text-12 text-fg-secondary">
            Game: {clip.game}
            {isClipAnalysed(clip) && ` • AI quality ${clip.aiQualityScore}/100`}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 text-11 text-fg-muted">
            <span>{source ? `Source: ${source} link` : "External link"}</span>
            <AnalysisTag clip={clip} size="sm" />
          </div>
        </div>
      </ClipLink>
    </li>
  );
}

/**
 * 06M .clips-carousel: horizontal scroll with CSS scroll-snap (x mandatory, cards snap to
 * start), bleeding to the screen edges (margin 0 -16px; padding 0 16px). 220px cards.
 */
function ClipCarousel({ clips }: { clips: Clip[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {clips.map((clip) => {
        const source = clipSource(clip.url);
        return (
          <li key={clip.id} className="w-[220px] shrink-0 snap-start">
            <ClipLink clip={clip} className="block overflow-hidden rounded-md border border-border bg-inset">
              <div className="relative flex h-[100px] items-center justify-center bg-surface-hover">
                <PlayOverlay size="sm" />
                {isClipAnalysed(clip) && <TrustBadge level="ai" size="sm" className="absolute top-1.5 right-1.5" />}
              </div>
              <div className="p-2.5">
                <p className="truncate text-12 font-bold">{clipTitle(clip)}</p>
                <p className="mt-0.5 text-10 text-fg-muted">{source ? `${source} link` : clip.game}</p>
              </div>
            </ClipLink>
          </li>
        );
      })}
    </ul>
  );
}

/** 06D .play-btn-overlay (42px) / 06M .play-btn-sm (32px). */
function PlayOverlay({ size }: { size: "md" | "sm" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-full border border-white/30 bg-bg/70 text-white",
        size === "md" ? "size-[42px] [&>svg]:size-[18px]" : "size-8 [&>svg]:size-3.5",
      )}
    >
      <Play />
    </span>
  );
}

function EvidenceSkeleton({ variant }: { variant: EvidenceVariant }) {
  if (variant === "carousel") {
    return (
      <div className="flex gap-3 overflow-hidden p-3" role="status" aria-label="Loading clips">
        <Skeleton className="h-[148px] w-[220px] shrink-0 rounded-md" />
        <Skeleton className="h-[148px] w-[220px] shrink-0 rounded-md" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-5" role="status" aria-label="Loading clips">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-[220px] rounded-lg" />
      ))}
    </div>
  );
}
