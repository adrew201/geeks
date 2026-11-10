import type { LeaderboardEntry } from "../../types/api.ts";

/** One bar of the "Talent by game" chart. */
export interface GamePoint {
  game: string;
  gamers: number;
  topScore: number;
}

/** Gamers per primary game, most first (ties: higher top score first). */
export function talentByGame(entries: LeaderboardEntry[]): GamePoint[] {
  const byGame = new Map<string, GamePoint>();
  for (const entry of entries) {
    const point = byGame.get(entry.primaryGame) ?? { game: entry.primaryGame, gamers: 0, topScore: 0 };
    point.gamers += 1;
    point.topScore = Math.max(point.topScore, entry.radScore);
    byGame.set(entry.primaryGame, point);
  }
  return [...byGame.values()].sort((a, b) => b.gamers - a.gamers || b.topScore - a.topScore);
}
