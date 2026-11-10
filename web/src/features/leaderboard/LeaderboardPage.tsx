import { useState } from "react";
import { Info, RefreshCw, Search } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Input } from "../../components/ui/Field.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { cn } from "../../lib/cn.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import { GAME_FILTERS } from "./api.ts";
import { DesktopPodium, MobilePodium, PodiumSkeleton } from "./Podium.tsx";
import { SCORE_LABEL } from "./rank-styles.ts";
import { RankingCards, RankingTable, RankingsSkeleton } from "./Rankings.tsx";
import { useLeaderboard, type LeaderboardController } from "./use-leaderboard.ts";
import { DesktopYourPosition, MobileYourPosition } from "./YourPosition.tsx";

// Page 10: Global Leaderboard. Desktop = 10D, mobile = 10M (no hero, no table: stacked
// cards; compact podium; search behind an icon).
//
// Hidden because the contract has no field or endpoint for them (README §14 only has
// GET /leaderboard?game=):
// - Region filter (10D Global/Africa/Kenya/Europe/North America; 10M Kenya/Global pills).
// - Period filter (10D All Time/This Month/This Week).
// - Trend column and "+N this week" (10D table, your-position card, 10M cards).
// - Hero stats: Ranked Gamers, Active Games, and "Live Sync / Updated 5m ago".
//   Animation note (docs/ui-audit.md §5c): "Live Sync" is described but never implemented
//   in the HTML; there is no live-update channel, so the Refresh button refetches instead.

const SEARCH_PLACEHOLDER = "Search gamer or ID...";

export default function LeaderboardPage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const board = useLeaderboard();
  return isDesktop ? <DesktopLeaderboard board={board} /> : <MobileLeaderboard board={board} />;
}

function DesktopLeaderboard({ board }: { board: LeaderboardController }) {
  return (
    <>
      <PageHeader
        title="Global Leaderboard"
        description="See who's leading. Track your progress. Rise through the ranks."
        actions={
          <>
            {/* Search filters the loaded rows client-side (README has no search endpoint). */}
            <div className="w-[280px]">
              <Input
                type="search"
                aria-label="Search gamer or ID"
                placeholder={SEARCH_PLACEHOLDER}
                value={board.search}
                onChange={(event) => board.setSearch(event.target.value)}
                leading={<Search />}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={board.refresh} disabled={board.status === "loading"}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Refresh
            </Button>
          </>
        }
      />
      <PageContainer>
        {/* 10D hero card copy; its three stats are hidden (no contract fields). */}
        <Card as="section" large padding="none" className="bg-glow-primary px-8 py-6">
          <div>
            <h2 className="text-18 font-extrabold">The competition starts here.</h2>
            <p className="mt-0.5 text-13 text-fg-muted">
              Discover standout gamers and see how the community is ranking talent.
            </p>
          </div>
        </Card>

        {/* 10D "SECTION D: RANKING FILTERS BAR": only the Game row has an API parameter. */}
        <Card as="section" aria-label="Filters" padding="none" elevated={false} className="px-5 py-4">
          <div className="flex items-center gap-4 text-12">
            <span id="game-filter-label" className="w-20 shrink-0 text-10 font-bold tracking-[0.5px] text-fg-muted uppercase">
              Game
            </span>
            <GamePills board={board} variant="desktop" labelledBy="game-filter-label" />
          </div>
        </Card>

        <Body board={board} variant="desktop" />
      </PageContainer>
    </>
  );
}

function MobileLeaderboard({ board }: { board: LeaderboardController }) {
  // 10M shows search as a header icon; tapping it reveals the field.
  const [searchOpen, setSearchOpen] = useState(board.search !== "");
  return (
    <>
      <PageHeader
        title="Leaderboard"
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label={searchOpen ? "Hide search" : "Search"}
            aria-expanded={searchOpen}
            aria-controls="leaderboard-search"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search className="size-4" aria-hidden="true" />
          </Button>
        }
      />
      <PageContainer>
        <div className="flex flex-col gap-3">
          {searchOpen && (
            <Input
              id="leaderboard-search"
              type="search"
              aria-label="Search gamer or ID"
              placeholder={SEARCH_PLACEHOLDER}
              value={board.search}
              onChange={(event) => board.setSearch(event.target.value)}
              leading={<Search />}
              autoFocus
            />
          )}
          <GamePills board={board} variant="mobile" />
          <Body board={board} variant="mobile" />
        </div>
      </PageContainer>
    </>
  );
}

// 10D .filter-pill (inset, radius-sm, active = solid primary) and
// 10M .filter-btn-m (surface, pill-shaped, horizontally scrollable).
const PILL: Record<"desktop" | "mobile", { base: string; idle: string }> = {
  desktop: {
    base: "rounded-sm px-3 py-[5px] text-12",
    idle: "border-border bg-inset text-fg-secondary hover:border-border-light hover:text-fg",
  },
  mobile: {
    base: "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-11",
    idle: "border-border bg-surface text-fg-secondary",
  },
};

function GamePills({
  board,
  variant,
  labelledBy,
}: {
  board: LeaderboardController;
  variant: "desktop" | "mobile";
  labelledBy?: string;
}) {
  const styles = PILL[variant];
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : "Game"}
      className={cn(
        "flex gap-1.5",
        variant === "desktop" ? "flex-wrap" : "overflow-x-auto pb-1 [scrollbar-width:none]",
      )}
    >
      {GAME_FILTERS.map(({ value, label, short }) => {
        const active = board.game === value;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => board.setGame(value)}
            className={cn(
              "cursor-pointer border font-semibold transition-all duration-200 ease-[ease]",
              styles.base,
              active ? "border-primary bg-primary text-white" : styles.idle,
            )}
          >
            {variant === "mobile" ? (short ?? label) : label}
          </button>
        );
      })}
    </div>
  );
}

function Body({ board, variant }: { board: LeaderboardController; variant: "desktop" | "mobile" }) {
  const desktop = variant === "desktop";

  if (board.status === "loading") {
    // 10D state E. Filters stay usable; only the data areas become skeletons.
    return (
      <div role="status" aria-label="Loading rankings" className={cn("flex flex-col", desktop ? "gap-6" : "gap-3")}>
        <PodiumSkeleton variant={variant} />
        <RankingsSkeleton variant={variant} />
      </div>
    );
  }

  if (board.status === "error") {
    return (
      <Card>
        <StatusPanel
          tone="danger"
          title="We couldn't load the leaderboard"
          description={board.error ?? undefined}
          actions={
            <Button variant="secondary" size="sm" onClick={board.refresh}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  }

  const rankingProps = {
    rows: board.visibleRows,
    meId: board.me?.gamerId ?? null,
    totalRows: board.rows.length,
    searching: board.search.trim() !== "",
    onClearFilters: board.clearFilters,
  };

  if (desktop) {
    return (
      <>
        <DesktopPodium entries={board.podium} />
        <RankingTable {...rankingProps} />
        <div className={cn("grid gap-6", board.signedIn && "grid-cols-2")}>
          {board.signedIn && <DesktopYourPosition me={board.me} />}
          <HowRankingsWork />
        </div>
      </>
    );
  }

  return (
    <>
      <MobilePodium entries={board.podium} />
      {board.signedIn && <MobileYourPosition me={board.me} />}
      <RankingCards {...rankingProps} />
    </>
  );
}

/** 10D "HOW RANKINGS WORK" (desktop only). "Ranking Score" → rad score (decision 5). */
function HowRankingsWork() {
  return (
    <Card as="section" large elevated={false}>
      <h2 className="flex items-center gap-2 text-14 font-bold">
        <Info className="size-4 text-ai" aria-hidden="true" />
        How rankings work
      </h2>
      <p className="text-12 text-fg-secondary">
        Play2Pro rankings are generated using the platform's configured ranking methodology. Positions reflect
        available performance and community data signals:
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Badge tone="blue">{SCORE_LABEL}</Badge>
        <Badge tone="violet">Community Ranking</Badge>
        <Badge tone="green">AI Assessment</Badge>
        <Badge tone="amber">Verified Achievements</Badge>
      </div>
    </Card>
  );
}
