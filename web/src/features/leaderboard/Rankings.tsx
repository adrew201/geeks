import { SearchX } from "lucide-react";
import { ROUTES, gamerProfilePath } from "../../components/layout/nav-config.ts";
import { Avatar } from "../../components/ui/Avatar.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { EmptyState } from "../../components/ui/EmptyState.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { cn } from "../../lib/cn.ts";
import type { LeaderboardEntry } from "../../types/api.ts";
import { SCORE_LABEL, formatScore, gameAndRegion, rankTextClass } from "./rank-styles.ts";

// Plain table for now; AG Grid arrives with the dashboards step.
// 10D Trend column hidden: no trend field in the contract.

export interface RankingsProps {
  rows: LeaderboardEntry[];
  /** The signed-in user's gamerId, highlighted when present (10D state G). */
  meId: string | null;
  /** Total loaded rows before search, for the results badge. */
  totalRows: number;
  searching: boolean;
  onClearFilters: () => void;
}

function NoResults({ onClearFilters }: { onClearFilters: () => void }) {
  // 10D state F copy; "region or ranking period" removed because those filters are hidden.
  return (
    <EmptyState
      card={false}
      icon={<SearchX />}
      title="No rankings found"
      description="Try changing your game filter or search."
      action={
        <Button variant="secondary" size="sm" onClick={onClearFilters}>
          Clear Filters
        </Button>
      }
    />
  );
}

function resultsLabel(shown: number, total: number, searching: boolean): string {
  if (searching) return `${shown} of ${total} shown`;
  return total === 0 ? "No positions" : `Showing positions 1 - ${total}`;
}

/** 10D "SECTION F: MAIN LEADERBOARD TABLE". */
export function RankingTable({ rows, meId, totalRows, searching, onClearFilters }: RankingsProps) {
  return (
    <Card as="section" large aria-labelledby="rankings-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="rankings-title" className="text-16 font-bold">
          Top Gamers Matrix
        </h2>
        <Badge>{resultsLabel(rows.length, totalRows, searching)}</Badge>
      </div>

      {rows.length === 0 ? (
        <NoResults onClearFilters={onClearFilters} />
      ) : (
        <table className="w-full border-collapse text-13">
          <caption className="sr-only">Gamers ranked by {SCORE_LABEL}</caption>
          <thead>
            <tr>
              {["Rank", "Gamer", "Game", "Region", SCORE_LABEL].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="border-b border-border px-4 py-3 text-left text-11 font-bold text-fg-muted uppercase"
                >
                  {heading}
                </th>
              ))}
              <th scope="col" className="border-b border-border px-4 py-3 text-right text-11 font-bold text-fg-muted uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isMe = row.gamerId === meId;
              const podium = row.rank <= 3;
              return (
                <tr
                  key={row.gamerId}
                  aria-current={isMe ? "true" : undefined}
                  className={cn(
                    "[&>td]:p-4 [&>td]:align-middle",
                    isMe
                      ? "[&>td]:border-y [&>td]:border-primary/35 [&>td]:bg-primary/14"
                      : "[&>td]:border-b [&>td]:border-white/4 hover:[&>td]:bg-white/2",
                  )}
                >
                  <td className={cn("font-display", podium || isMe ? "font-extrabold" : "font-bold", rankTextClass(row.rank, isMe))}>
                    #{row.rank}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={row.gamerTag} size="sm" />
                      <div className="min-w-0">
                        <p className="font-bold text-fg">
                          {row.gamerTag}
                          {isMe && " (You)"}
                        </p>
                        <p className={cn("text-10", isMe ? "text-primary" : "text-fg-muted")}>ID: {row.gamerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-fg-secondary">{row.game}</td>
                  <td className="text-fg-secondary">{row.region ?? "—"}</td>
                  <td
                    className={cn(
                      "font-display font-bold",
                      isMe ? "text-14 text-primary" : podium ? "text-15 text-success" : "text-14 text-fg",
                    )}
                  >
                    {formatScore(row.radScore)}
                  </td>
                  <td className="text-right">
                    {isMe ? (
                      <ButtonLink to={ROUTES.passport} variant="secondary" size="sm">
                        My Profile
                      </ButtonLink>
                    ) : (
                      <ButtonLink
                        to={gamerProfilePath(row.gamerId)}
                        variant="ghost"
                        size="sm"
                        aria-label={`${row.gamerTag}'s profile`}
                      >
                        Profile
                      </ButtonLink>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/** 10M stacked gamer rank cards (mobile has no table). */
export function RankingCards({ rows, meId, onClearFilters }: RankingsProps) {
  if (rows.length === 0) {
    return (
      <Card padding="none">
        <NoResults onClearFilters={onClearFilters} />
      </Card>
    );
  }
  return (
    <ol aria-label={`Gamers ranked by ${SCORE_LABEL}`} className="flex flex-col gap-2">
      {rows.map((row) => {
        const isMe = row.gamerId === meId;
        return (
          <li
            key={row.gamerId}
            aria-current={isMe ? "true" : undefined}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5",
              isMe ? "border-primary bg-primary/14" : "border-border bg-inset",
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn("font-display font-extrabold", rankTextClass(row.rank, isMe))}>#{row.rank}</span>
              <div className="min-w-0">
                <p className={cn("truncate text-12", isMe ? "font-extrabold text-primary" : "font-bold")}>
                  {row.gamerTag}
                  {isMe && " (You)"}
                </p>
                <p className="truncate text-10 text-fg-muted">{gameAndRegion(row.game, row.region)}</p>
              </div>
            </div>
            <span className={cn("font-display font-bold", isMe ? "text-primary" : "text-success")}>
              {formatScore(row.radScore)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function RankingsSkeleton({ variant }: { variant: "desktop" | "mobile" }) {
  const rows = variant === "desktop" ? 6 : 4;
  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-[52px]" />
        ))}
      </div>
    );
  }
  return (
    <Card large>
      <Skeleton className="h-5 w-48" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </Card>
  );
}
