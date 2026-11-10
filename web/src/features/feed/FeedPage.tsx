import type { ReactNode } from "react";
import { CircleAlert, Crosshair, Film, Info, Users } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { useSession } from "../../lib/session.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import { ROLE } from "../../types/api.ts";
import { HouseAdCard } from "./HouseAdCard.tsx";
import { ReelCard, ReelFrame, ReelOverlay, type FeedVariant } from "./ReelCard.tsx";
import { useFeed, type FeedController } from "./use-feed.ts";
import { SELECTABLE_STATUSES } from "./vote-options.ts";
import { DesktopVotePanel, MobileVotePanel } from "./VotePanel.tsx";

// Page 09: Swipe-to-Rank Reel ("Community Arena"). Desktop = 09D, mobile = 09M (a separate,
// simpler design: no identity row, no Skip, no info card).
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

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            Community Arena
            {isDesktop ? (
              <Badge tone="violet" icon={<Users className="size-2.5" aria-hidden="true" />}>
                Community ranking
              </Badge>
            ) : (
              // 09M:261 "SWIPE FEED" badge: the gesture it names is implemented in use-swipe.ts.
              <Badge tone="violet">Swipe feed</Badge>
            )}
          </span>
        }
        description={
          isDesktop
            ? "Watch gameplay clips. Discover emerging talent. Make your community vote count."
            : undefined
        }
        actions={
          // Mobile entry point for gamers: Bounties isn't a bottom tab (decision 7).
          !isDesktop && session?.role === ROLE.GAMER ? (
            <ButtonLink to={ROUTES.bounties} variant="secondary" size="sm">
              <Crosshair className="size-3.5" aria-hidden="true" />
              Bounties
            </ButtonLink>
          ) : undefined
        }
      />
      <PageContainer>
        {isDesktop ? (
          // 09D .reel-body-grid: 420px reel + flexible controls column, 32px gap.
          <div className="grid grid-cols-[420px_1fr] items-start gap-8">
            <Reel feed={feed} variant="desktop" />
            <div className="flex flex-col gap-6">
              <DesktopVotePanel
                vote={feed.vote}
                hasClip={feed.current?.kind === "clip"}
                onSelect={feed.select}
                onSubmit={feed.submit}
                onNext={feed.advance}
              />
              <HowVotingWorks />
            </div>
          </div>
        ) : (
          // 09M .mobile-body: reel and vote card stacked, 12px gap.
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
        )}
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

/** 09D "SECTION F: HOW VOTING WORKS" (desktop only; 09M has no info card). */
function HowVotingWorks() {
  return (
    <Card as="section">
      <h2 className="flex items-center gap-2 text-13 font-bold">
        <Info className="size-4 text-ai" aria-hidden="true" />
        How Voting Works
      </h2>
      <p className="text-12 text-fg-secondary">
        Your vote contributes to community feedback and helps surface promising gamers. Community votes are one
        audience signal, not a verified measure of gaming skill.
      </p>
    </Card>
  );
}
