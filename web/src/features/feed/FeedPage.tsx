import type { ReactNode } from "react";
import { CircleAlert, Crosshair, Film } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { useSession } from "../../lib/session.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import { ROLE } from "../../types/api.ts";
import { HouseAdCard } from "./HouseAdCard.tsx";
import { FloatingVote } from "./FloatingVote.tsx";
import { ReelCard, ReelFrame, ReelOverlay, type FeedVariant } from "./ReelCard.tsx";
import { useFeed, type FeedController } from "./use-feed.ts";
import { SELECTABLE_STATUSES } from "./vote-options.ts";
import { MobileVotePanel } from "./VotePanel.tsx";

// Page 09: Swipe-to-Rank Reel ("Community Arena").
// Desktop = full screen: the reel fills the arena area, with floating Needs Work / Impressive
// arrows (FloatingVote.tsx) and a Skip button. Mobile = 09M, a stacked reel and vote card.
//
// Hidden because the contract has no field or endpoint for them (README §14):
// - 09D feed filter pills (For You / Trending / New Gamers / Following): GET /feed takes only `cursor`.
// - 09D/09M engagement stats (total votes, approval %, views, saves).
// - 09D Bookmark button (no save endpoint), verified tick, clip mode and duration.
// Dropped by decision 1: the "Average" option and the feedback textarea.

export default function FeedPage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const feed = useFeed();
  const session = useSession();

  if (isDesktop) {
    // Fills the viewport below the top bar (about 4.5rem). The page title is kept for screen
    // readers only, so the screen stays uncluttered.
    return (
      <div className="relative h-[calc(100dvh-4.5rem)] min-h-[560px] w-full overflow-hidden">
        <h1 className="sr-only">Community Arena</h1>
        <Reel feed={feed} variant="screen" />
        <FloatingVote
          vote={feed.vote}
          hasClip={feed.current?.kind === "clip"}
          onSubmit={feed.submit}
          onNext={feed.advance}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            Community Arena
            {/* 09M:261 "SWIPE FEED" badge: the gesture it names is implemented in use-swipe.ts. */}
            <Badge tone="violet">Swipe feed</Badge>
          </span>
        }
        actions={
          // Mobile entry point for gamers: Bounties isn't a bottom tab (decision 7).
          session?.role === ROLE.GAMER ? (
            <ButtonLink to={ROUTES.bounties} variant="secondary" size="sm">
              <Crosshair className="size-3.5" aria-hidden="true" />
              Bounties
            </ButtonLink>
          ) : undefined
        }
      />
      <PageContainer>
        {/* 09M .mobile-body: reel and vote card stacked, 12px gap. */}
        <div className="flex flex-col gap-3">
          <Reel feed={feed} variant="mobile" />
          {feed.current?.kind === "clip" && (
            <MobileVotePanel
              vote={feed.vote}
              hasClip
              onSelect={feed.select}
              onSubmit={feed.submit}
              onNext={feed.advance}
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}

function Reel({ feed, variant }: { feed: FeedController; variant: FeedVariant }) {
  const { phase, current, vote } = feed;

  if (phase !== "ready" || !current) {
    return (
      <ReelFrame variant={variant} aria-busy={phase === "loading" || undefined}>
        <ReelOverlay>{feedStatus(feed)}</ReelOverlay>
      </ReelFrame>
    );
  }

  if (current.kind === "ad") {
    return <HouseAdCard key={`ad-${current.ad.id}`} variant={variant} ad={current.ad} onNext={feed.advance} />;
  }

  return (
    <ReelCard
      key={current.clip.id}
      variant={variant}
      clip={current.clip}
      owner={current.owner}
      voteStatus={vote.status}
      swipeEnabled={SELECTABLE_STATUSES.includes(vote.status)}
      onSwipe={feed.submit}
      overlay={
        vote.status === "unavailable" ? (
          // 09D #unavailable-panel. The trigger is real now: the vote endpoint said NOT_FOUND.
          <StatusPanel
            tone="warning"
            icon={<CircleAlert />}
            title="This gameplay clip is temporarily unavailable"
            description="It may have been removed. Skip it to keep ranking."
            actions={
              <Button variant="secondary" size="sm" onClick={feed.advance}>
                Skip Clip
              </Button>
            }
          />
        ) : undefined
      }
    />
  );
}

function feedStatus({ phase, loadError, retry }: FeedController): ReactNode {
  if (phase === "loading") {
    // 09D #loading-panel copy.
    return (
      <StatusPanel
        tone="loading"
        title="Fetching next clip..."
        description="Retrieving fresh gameplay evidence from server queue."
      />
    );
  }
  if (phase === "error") {
    return (
      <StatusPanel
        tone="warning"
        icon={<CircleAlert />}
        title="The arena is temporarily unavailable"
        description={loadError ?? undefined}
        actions={
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        }
      />
    );
  }
  // 09D #empty-panel copy.
  return (
    <StatusPanel
      tone="neutral"
      icon={<Film />}
      title="No gameplay clips available right now"
      description="Check back later as more gamers submit their gameplay for review."
      actions={
        <ButtonLink to={ROUTES.leaderboard} size="sm">
          Explore Leaderboard
        </ButtonLink>
      }
    />
  );
}
