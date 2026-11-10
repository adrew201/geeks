import { GAMES, GAME_SLUGS, type GameSlug } from "../../config/games.ts";
import { api } from "../../lib/api-client.ts";
import type { LeaderboardResponse } from "../../types/api.ts";

export const LEADERBOARD_PATH = "/api/v1/leaderboard";

// GET /api/v1/leaderboard?game=<slug> (Fabiola). The JWT is sent when signed in so the
// response can include the caller's own position (`me`).
export function fetchLeaderboard(game: GameSlug, signal?: AbortSignal): Promise<LeaderboardResponse> {
  return api.get<LeaderboardResponse>(LEADERBOARD_PATH, { query: { game }, signal });
}

/**
 * The 10D game pills, built from config/games.ts (UNCONFIRMED list, see there).
 * 10D's "All Games" pill is hidden: the contract is one board per game slug.
 */
export const GAME_FILTERS: Array<{ value: GameSlug; label: string; short?: string }> = GAME_SLUGS.map(
  (slug) => {
    const game: { name: string; short?: string } = GAMES[slug];
    return { value: slug, label: game.name, short: game.short };
  },
);

export const DEFAULT_GAME: GameSlug = GAME_SLUGS[0] ?? "valorant";
