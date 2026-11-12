import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, Crosshair, Plus, RefreshCw, Search, Sparkles, Users, X } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES, bountyPath, gamerProfilePath } from "../../components/layout/nav-config.ts";
import { StatGrid, StatTile, StatTileSkeleton } from "../../components/data/StatTile.tsx";
import { Avatar } from "../../components/ui/Avatar.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Input, Select } from "../../components/ui/Field.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { TrustBadge } from "../../components/ui/TrustBadge.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import { formatMoney } from "../../lib/format-money.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import type { Bounty, CoachMatch, LeaderboardEntry } from "../../types/api.ts";
import { formatDeadline } from "../bounties/bounty-status.ts";
import { formatNumber } from "../profile/profile-model.ts";
import { TalentByGameChart } from "./TalentByGameChart.tsx";
import { TalentGrid } from "./TalentGrid.tsx";
import { useDiscover, type Load } from "./use-discover.ts";
import { useSession } from "../../lib/session.ts";
import { entitlementsFor } from "../plans/plans.ts";
import { RecommendationSettingsCard } from "./RecommendationSettingsCard.tsx";
import { applySettings, useRecommendationSettings } from "./recommendation-settings.ts";

// /discover: page 11 (Talent Discovery Dashboard), coaches and sponsors.
// 11D sections kept: overview stats, search + filters, featured gamers, browse-all grid.
//   Coach:   featured = AI talent matches (GET /coach/matches, README §14).
//   Sponsor: featured = top of the leaderboard (coach matches are COACH-only), plus a
//            summary of the sponsor's own open bounties.
// Removed (decision 3 / no contract): "View Profile & VODs" (now "View profile"), Unlock
// History, Saved Candidates (no save field or endpoint), the availability and ranking-mode
// selects (no fields). 11D's filters ignored 2 of 4 selects; these all work.

const ALL = "";
const FEATURED_COUNT = 3;

export default function DiscoverPage() {
  const { isCoach, isSponsor, talent, matches, bounties } = useDiscover();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState(ALL);
  const [region, setRegion] = useState(ALL);

  useEffect(() => {
    document.title = "Discover Talent · Play2Pro";
  }, []);

  const entries = useMemo(() => (talent.value.status === "ready" ? talent.value.data : []), [talent.value]);
  const games = useMemo(() => [...new Set(entries.map((entry) => entry.primaryGame))].sort(), [entries]);
  const regions = useMemo(
    () => [...new Set(entries.map((entry) => entry.region).filter((value): value is string => Boolean(value)))].sort(),
    [entries],
  );
  const filtered = useMemo(
    () =>
      entries.filter(
        (entry) => (game === ALL || entry.primaryGame === game) && (region === ALL || entry.region === region),
      ),
    [entries, game, region],
  );
  const filtersActive = search !== "" || game !== ALL || region !== ALL;

  // Coaches: the AI matches pass through their recommendation settings (limits from their plan).
  const recommendations = entitlementsFor(useSession()).recommendations;
  const [settings, setSettings] = useRecommendationSettings();
  const matchLoad = matches.value;
  const shownMatches = useMemo<Load<CoachMatch[]>>(
    () =>
      matchLoad.status === "ready" && recommendations
        ? { status: "ready", data: applySettings(matchLoad.data, settings, recommendations) }
        : matchLoad,
    [matchLoad, settings, recommendations],
  );
  const matchGames = useMemo(
    () => [...new Set([...games, ...(matchLoad.status === "ready" ? matchLoad.data.map((m) => m.game) : [])])].sort(),
    [games, matchLoad],
  );

  function clearFilters() {
    setSearch("");
    setGame(ALL);
    setRegion(ALL);
  }

  return (
    <>
      <PageHeader
        title="Discover Talent"
        description="Find your next competitive advantage through verified gameplay evidence."
        actions={
          isSponsor && (
            <ButtonLink to={ROUTES.bountyNew} size={isDesktop ? "md" : "sm"}>
              <Plus className="size-3.5" aria-hidden="true" />
              Create bounty
            </ButtonLink>
          )
        }
      />
      <PageContainer>
        <Overview talent={talent.value} matches={isCoach ? matches.value : null} bounties={isSponsor ? bounties.value : null} />

        {talent.value.status === "error" ? (
          <Card>
            <StatusPanel
              tone="danger"
              title="Couldn't load gamers"
              description={talent.value.error}
              actions={<RetryButton onClick={talent.reload} />}
            />
          </Card>
        ) : (
          <>
            {isCoach && recommendations && (
              <RecommendationSettingsCard
                settings={settings}
                onChange={setSettings}
                allowed={recommendations}
                games={matchGames}
                regions={regions}
              />
            )}
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              {isCoach ? (
                <MatchesSection load={shownMatches} onRetry={matches.reload} />
              ) : (
                <FeaturedSection load={talent.value} />
              )}
              <TalentChartCard load={talent.value} />
            </div>
            {isSponsor && <SponsorBounties load={bounties.value} onRetry={bounties.reload} />}

            <Card>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-16 font-bold">Explore all gamers</h2>
                  <p className="text-12 text-fg-muted" aria-live="polite">
                    {talent.value.status === "ready"
                      ? `Showing ${filtered.length} of ${entries.length} ranked gamers`
                      : "Loading gamers…"}
                  </p>
                </div>
                {filtersActive && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="size-3.5" aria-hidden="true" />
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <Input
                  type="search"
                  aria-label="Search gamers"
                  placeholder="Search by gamer tag or name"
                  leading={<Search />}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Select aria-label="Game" value={game} onChange={(event) => setGame(event.target.value)}>
                  <option value={ALL}>All games</option>
                  {games.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
                <Select aria-label="Region" value={region} onChange={(event) => setRegion(event.target.value)}>
                  <option value={ALL}>All regions</option>
                  {regions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
              {talent.value.status === "loading" ? (
                <div className="flex flex-col gap-2" aria-busy="true">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <Skeleton key={index} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <TalentGrid entries={filtered} search={search} compact={!isDesktop} />
              )}
            </Card>
            <p className="text-center text-12 text-fg-muted">
              Great talent isn't always at the top of the leaderboard. Explore different games and regions to find
              emerging players.
            </p>
          </>
        )}
      </PageContainer>
    </>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      <RefreshCw className="size-3.5" aria-hidden="true" />
      Try again
    </Button>
  );
}

function SectionTitle({ title, description, aside }: { title: string; description?: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-16 font-bold">{title}</h2>
        {description && <p className="text-12 text-fg-muted">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

/* ------------------------------ overview ------------------------------ */

function Overview({
  talent,
  matches,
  bounties,
}: {
  talent: Load<LeaderboardEntry[]>;
  matches: Load<CoachMatch[]> | null;
  bounties: Load<Bounty[]> | null;
}) {
  if (talent.status === "loading") {
    return (
      <StatGrid>
        {[0, 1, 2, 3].map((index) => (
          <StatTileSkeleton key={index} />
        ))}
      </StatGrid>
    );
  }
  const entries = talent.status === "ready" ? talent.data : [];
  const top = entries.reduce((max, entry) => Math.max(max, entry.radScore), 0);
  const games = new Set(entries.map((entry) => entry.primaryGame)).size;
  const regions = new Set(entries.map((entry) => entry.region).filter(Boolean)).size;

  let fourth: ReactNode = <StatTile label="Regions" value={formatNumber(regions)} hint="Where ranked gamers play from" />;
  if (matches) {
    fourth = (
      <StatTile
        label="AI matches"
        value={matches.status === "ready" ? formatNumber(matches.data.length) : "—"}
        hint="Picked for you by the AI scout"
        emphasis="primary"
      />
    );
  } else if (bounties) {
    const held = bounties.status === "ready" ? bounties.data.reduce((sum, bounty) => sum + bounty.reward, 0) : null;
    fourth = (
      <StatTile
        label="Rewards held"
        value={held === null ? "—" : formatMoney(held)}
        hint={bounties.status === "ready" ? `${bounties.data.length} open bounties` : "Your open bounties"}
      />
    );
  }

  return (
    <StatGrid>
      <StatTile label="Ranked gamers" value={formatNumber(entries.length)} hint="On the overall leaderboard" />
      <StatTile label={`Top ${RAD_SCORE_LABEL}`} value={formatNumber(top)} emphasis="success" hint="Highest on the board" />
      <StatTile label="Games" value={formatNumber(games)} hint="Primary games represented" />
      {fourth}
    </StatGrid>
  );
}

/* ------------------------------ featured ------------------------------ */

function FeaturedCard({
  to,
  tag,
  subtitle,
  score,
  reason,
  ai,
}: {
  to: string;
  tag: string;
  subtitle: string;
  score: number;
  reason?: string;
  ai?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex h-full flex-col gap-3 rounded-lg bg-inset p-4 transition-all duration-200 hover:border-border-light hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
    >
      <div className="flex items-center gap-3">
        <Avatar name={tag} size="md" shape="tile" />
        <div className="min-w-0">
          <p className="truncate text-14 font-bold">{tag}</p>
          <p className="truncate text-11 text-fg-muted">{subtitle}</p>
        </div>
      </div>
      <div>
        <p className="text-10 font-bold tracking-[0.5px] text-fg-muted uppercase">{RAD_SCORE_LABEL}</p>
        <p className="font-display text-22 font-bold text-success">{formatNumber(score)}</p>
      </div>
      {reason && <p className="line-clamp-3 text-12 text-fg-secondary">{reason}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <TrustBadge level="community" size="sm" />
        {ai && <TrustBadge level="ai" size="sm" />}
      </div>
      <span className="inline-flex items-center gap-1 text-12 font-semibold text-primary">
        View profile
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg bg-inset p-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Sponsors: the top of the leaderboard. */
function FeaturedSection({ load }: { load: Load<LeaderboardEntry[]> }) {
  return (
    <Card>
      <SectionTitle title="Featured gamers" description="Standout players from across the community." />
      {load.status === "loading" ? (
        <FeaturedSkeleton />
      ) : load.status === "ready" && load.data.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {load.data.slice(0, FEATURED_COUNT).map((entry) => (
            <li key={entry.gamerId}>
              <FeaturedCard
                to={gamerProfilePath(entry.gamerId)}
                tag={entry.gamerTag}
                subtitle={[entry.primaryGame, entry.region].filter(Boolean).join(" • ")}
                score={entry.radScore}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-13 text-fg-muted">No ranked gamers yet.</p>
      )}
    </Card>
  );
}

/** Coaches: AI talent matches (README §10 coach matching, advisory). */
function MatchesSection({ load, onRetry }: { load: Load<CoachMatch[]>; onRetry: () => void }) {
  return (
    <Card>
      <SectionTitle
        title="AI talent matches"
        description="Gamers the AI scout picked for you, with its reasoning. Always check the evidence."
        aside={
          <Badge tone="violet" size="sm" icon={<Sparkles className="size-3" aria-hidden="true" />}>
            AI scout
          </Badge>
        }
      />
      {load.status === "loading" && <FeaturedSkeleton />}
      {load.status === "error" && (
        <StatusPanel tone="danger" title="Couldn't load your matches" description={load.error} actions={<RetryButton onClick={onRetry} />} />
      )}
      {load.status === "ready" &&
        (load.data.length === 0 ? (
          <StatusPanel
            tone="neutral"
            icon={<Users />}
            title="No matches yet"
            description="The AI scout needs more analysed clips to suggest players. Browse everyone below in the meantime."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {/* Already filtered and capped by the coach's recommendation settings. */}
            {load.data.map((match) => (
              <li key={match.gamerId}>
                <FeaturedCard
                  to={gamerProfilePath(match.gamerId)}
                  tag={match.gamerTag}
                  subtitle={[match.game, match.region].filter(Boolean).join(" • ")}
                  score={match.radScore}
                  reason={match.reason}
                  ai
                />
              </li>
            ))}
          </ul>
        ))}
    </Card>
  );
}

function TalentChartCard({ load }: { load: Load<LeaderboardEntry[]> }) {
  return (
    <Card>
      <SectionTitle title="Talent by game" description="Ranked gamers per primary game." />
      {load.status === "loading" ? (
        <Skeleton className="h-40 w-full" />
      ) : load.status === "ready" && load.data.length > 0 ? (
        <TalentByGameChart entries={load.data} />
      ) : (
        <p className="py-6 text-center text-13 text-fg-muted">No ranked gamers yet.</p>
      )}
    </Card>
  );
}

/* ------------------------------ sponsor summary ------------------------------ */

function SponsorBounties({ load, onRetry }: { load: Load<Bounty[]>; onRetry: () => void }) {
  return (
    <Card>
      <SectionTitle
        title="Your open bounties"
        description="Rewards PayPal is holding until you confirm a winner."
        aside={
          <ButtonLink to={ROUTES.bounties} variant="ghost" size="sm">
            View all
          </ButtonLink>
        }
      />
      {load.status === "loading" && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {load.status === "error" && (
        <StatusPanel tone="danger" title="Couldn't load your bounties" description={load.error} actions={<RetryButton onClick={onRetry} />} />
      )}
      {load.status === "ready" &&
        (load.data.length === 0 ? (
          <StatusPanel
            tone="neutral"
            icon={<Crosshair />}
            title="No open bounties"
            description="Post a challenge to find gamers who can deliver."
            actions={
              <ButtonLink to={ROUTES.bountyNew} size="sm">
                <Plus className="size-3.5" aria-hidden="true" />
                Create bounty
              </ButtonLink>
            }
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {load.data.slice(0, 4).map((bounty) => (
              <li key={bounty.id}>
                <Link
                  to={bountyPath(bounty.id)}
                  className="flex items-center justify-between gap-3 rounded-md bg-inset px-3.5 py-3 transition-all duration-200 hover:border-border-light hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
                >
                  <div className="min-w-0">
                    <p className="truncate text-13 font-semibold">{bounty.title}</p>
                    <p className="truncate text-11 text-fg-muted">Ends {formatDeadline(bounty.deadline)}</p>
                  </div>
                  <span className="font-display text-14 font-bold whitespace-nowrap">{formatMoney(bounty.reward)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </Card>
  );
}
