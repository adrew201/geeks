import { Award, CloudUpload } from "lucide-react";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { ButtonLink } from "../../components/ui/Button.tsx";
import type { LeaderboardMe } from "../../types/api.ts";
import { SCORE_LABEL, formatScore, gameName } from "./rank-styles.ts";

// 10D .your-rank-card and 10M "YOUR RANKING" strip. "+6 this week" is hidden: no trend field.
// `me` comes from the leaderboard response, so a user ranked outside the returned rows
// still sees their position. It is null for coaches, sponsors and gamers with no clips in
// the selected game: only then is "not ranked yet" shown (10D state D).
// `me` has no gamerTag or region, so the card shows rank, game and score only.

export function DesktopYourPosition({ me }: { me: LeaderboardMe | null }) {
  return (
    <section
      aria-labelledby="your-position-title"
      className="flex flex-col justify-between gap-4 rounded-xl border border-primary/35 bg-surface bg-glow-primary p-6"
    >
      {me ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 id="your-position-title" className="text-12 font-bold text-primary uppercase">
              Your position
            </h2>
            <Badge tone="blue">{gameName(me.game)}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-display text-40 leading-none font-bold text-primary">#{me.rank}</p>
            <div className="min-w-0">
              <p className="text-12 text-fg-muted">
                {SCORE_LABEL}: <strong className="text-fg">{formatScore(me.radScore)}</strong>
              </p>
            </div>
          </div>
          <ButtonLink to={ROUTES.passport}>
            <Award className="size-3.5" aria-hidden="true" />
            View My Skills Passport
          </ButtonLink>
        </>
      ) : (
        <>
          <h2 id="your-position-title" className="text-12 font-bold text-fg-muted uppercase">
            Your position
          </h2>
          <div className="flex flex-col gap-1">
            <p className="text-14 font-bold">Your ranking is not available yet.</p>
            <p className="text-12 text-fg-muted">
              Complete your profile and submit gameplay footage to get ranked.
            </p>
          </div>
          <ButtonLink to={ROUTES.submitGameplay} size="sm" className="self-start">
            <CloudUpload className="size-3.5" aria-hidden="true" />
            Submit Gameplay
          </ButtonLink>
        </>
      )}
    </section>
  );
}

export function MobileYourPosition({ me }: { me: LeaderboardMe | null }) {
  return (
    <section
      aria-label="Your ranking"
      className="flex items-center justify-between gap-3 rounded-md border border-primary bg-primary/14 px-3 py-2.5"
    >
      <div className="min-w-0">
        <p className="text-9 font-bold text-primary uppercase">Your ranking</p>
        <p className="truncate text-13 font-extrabold">{me ? `#${me.rank} in ${gameName(me.game)}` : "Not ranked yet"}</p>
      </div>
      {me ? (
        <p className="font-display text-14 font-bold text-primary">{formatScore(me.radScore)}</p>
      ) : (
        <ButtonLink to={ROUTES.submitGameplay} size="sm">
          Submit Gameplay
        </ButtonLink>
      )}
    </section>
  );
}
