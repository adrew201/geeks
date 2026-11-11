import { GAMES, GAME_SLUGS, type GameSlug } from "../../config/games.ts";
import { api } from "../../lib/api-client.ts";
import type { LeaderboardResponse } from "../../types/api.ts";

export const LEADERBOARD_PATH = "/api/v1/leaderboard";

/** A game slug, or null for the overall board. */
export type GameFilter = GameSlug | null;

// GET /api/v1/leaderboard (Fabiola). Public route, so no JWT is sent. The API matches `game`
// against the stored display name ("Valorant"), not the app's slug; null leaves it out.
export function fetchLeaderboard(game: GameFilter, signal?: AbortSignal): Promise<LeaderboardResponse> {
  return api.get<LeaderboardResponse>(LEADERBOARD_PATH, {
    query: game ? { game: GAMES[game].name } : undefined,
    signal,
    auth: false,
  });
}

/** The 10D game pills: "All Games" (the overall board) plus the seed's games (config/games.ts). */
export const GAME_FILTERS: Array<{ value: GameFilter; label: string; short?: string }> = [
  { value: null, label: "All Games" },
  ...GAME_SLUGS.map((slug) => {
    const game: { name: string; short?: string } = GAMES[slug];
    return { value: slug, label: game.name, short: game.short };
  }),
];

export const DEFAULT_GAME: GameFilter = null;

/** Pill and heading label for a filter. */
export function gameFilterLabel(game: GameFilter): string {
  return game ? GAMES[game].name : "All Games";
}

/** Most entries the API returns per board. */
export const LEADERBOARD_SIZE = 50;
