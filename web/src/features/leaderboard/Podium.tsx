import { gamerProfilePath } from "../../components/layout/nav-config.ts";
import { Avatar } from "../../components/ui/Avatar.tsx";
import { ButtonLink } from "../../components/ui/Button.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { cn } from "../../lib/cn.ts";
import type { LeaderboardRow } from "../../types/api.ts";
import { SCORE_LABEL, formatScore, gameName } from "./rank-styles.ts";

// 10D "SECTION E: TOP THREE GAMERS PODIUM": shown in 2-1-3 order, #1 taller and gold.
// Hover lift: 10D:469 `.podium-card:hover { transform: translateY(-4px); }` with the
// card's `transition: transform 0.2s ease` (10D:467).
// Region under the gamer tag is hidden: leaderboard rows carry no region.
// UNCONFIRMED: profile links use userId (rows have no gamerId); same assumption as
// features/profile/api.ts, which loads GET /gamers/:userId.

const DESKTOP_ORDER = [1, 0, 2];

const BADGE: Record<number, string> = {
  1: "bg-rank-gold text-white",
  2: "bg-fg-secondary text-bg",
  3: "bg-rank-bronze text-white",
};

const BORDER: Record<number, string> = {
  1: "border-rank-gold",
  2: "border-fg-secondary/35",
  3: "border-rank-bronze/35",
};

export function DesktopPodium({ entries }: { entries: LeaderboardRow[] }) {
  if (entries.length === 0) return null;
  return (
    <section aria-label="Top three" className="mt-2 grid grid-cols-[1fr_1.15fr_1fr] items-end gap-5">
      {DESKTOP_ORDER.map((index) => {
        const entry = entries[index];
        if (!entry) return <div key={index} aria-hidden="true" />;
        const first = entry.rank === 1;
        return (
          <article
            key={entry.userId}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-xl border bg-surface px-5 text-center shadow-card transition-transform duration-200 ease-[ease] hover:-translate-y-1",
              BORDER[entry.rank] ?? "border-border",
              first ? "py-8" : "py-6",
            )}
          >
            <span
              aria-label={`Rank ${entry.rank}`}
              className={cn(
                "absolute -top-4 flex size-8 items-center justify-center rounded-full font-display text-15 font-bold",
                BADGE[entry.rank] ?? "bg-avatar text-fg",
              )}
            >
              {entry.rank}
            </span>
            <Avatar name={entry.gamerTag} shape="tile" size={first ? "xl" : "lg"} />
            <div>
              <p className={cn("font-extrabold", first ? "text-18 text-white" : "text-16")}>{entry.gamerTag}</p>
              <p className={cn("text-11", first ? "text-fg-secondary" : "text-fg-muted")}>
                {gameName(entry.game)}
              </p>
            </div>
            <p
              className={cn(
                "font-display leading-none font-bold",
                first ? "text-32 text-rank-gold" : "text-26 text-success",
              )}
            >
              {formatScore(entry.radScore)}
            </p>
            <span className="text-10 font-semibold tracking-[0.5px] text-fg-muted uppercase">{SCORE_LABEL}</span>
            <ButtonLink
              to={gamerProfilePath(entry.userId)}
              variant={first ? "primary" : "secondary"}
              size="sm"
              aria-label={`View ${entry.gamerTag}'s profile`}
            >
              View Profile
            </ButtonLink>
          </article>
        );
      })}
    </section>
  );
}

/** 10M .mobile-podium-row: compact three-up cards, #1 in the middle. */
export function MobilePodium({ entries }: { entries: LeaderboardRow[] }) {
  if (entries.length === 0) return null;
  return (
    <section aria-label="Top three" className="grid grid-cols-3 gap-2">
      {DESKTOP_ORDER.map((index) => {
        const entry = entries[index];
        if (!entry) return <div key={index} aria-hidden="true" />;
        const first = entry.rank === 1;
        return (
          <article
            key={entry.userId}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-md border px-1.5 py-2.5 text-center",
              first ? "border-rank-gold bg-rank-gold/14" : "border-border bg-surface",
            )}
          >
            <span className={cn("text-10 font-extrabold", first ? "text-rank-gold" : "text-fg-muted")}>
              #{entry.rank}
              {first && " WINNER"}
            </span>
            <p className={cn("w-full truncate text-12", first ? "font-extrabold text-white" : "font-bold")}>
              {entry.gamerTag}
            </p>
            <p className={cn("font-display font-bold", first ? "text-15 text-rank-gold" : "text-14 text-success")}>
              {formatScore(entry.radScore)}
            </p>
          </article>
        );
      })}
    </section>
  );
}

/** 10D state E: podium skeletons. */
export function PodiumSkeleton({ variant }: { variant: "desktop" | "mobile" }) {
  return variant === "desktop" ? (
    <div className="mt-2 grid grid-cols-[1fr_1.15fr_1fr] items-end gap-5">
      <Skeleton className="h-[260px]" />
      <Skeleton className="h-[300px]" />
      <Skeleton className="h-[260px]" />
    </div>
  ) : (
    <div className="grid grid-cols-3 gap-2">
      <Skeleton className="h-[74px]" />
      <Skeleton className="h-[74px]" />
      <Skeleton className="h-[74px]" />
    </div>
  );
}
