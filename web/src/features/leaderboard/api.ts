import { api } from "../../lib/api-client.ts";
import type { LeaderboardResponse } from "../../types/api.ts";

// README §14: GET /api/v1/leaderboard?game= (Fabiola). Public, so no JWT is sent.
// `game` is omitted for "All Games".
export function fetchLeaderboard(game: string | null, signal?: AbortSignal): Promise<LeaderboardResponse> {
  return api.get<LeaderboardResponse>("/api/v1/leaderboard", { query: { game }, signal, auth: false });
}

/**
 * The 10D game pills. README has no "list games" endpoint, so the list comes from the design.
 * UNCONFIRMED: that `game=` takes these display names as-is (the seed data decides).
 * `short` is the 10M label.
 */
export const GAME_FILTERS: Array<{ value: string | null; label: string; short?: string }> = [
  { value: null, label: "All Games" },
  { value: "Valorant", label: "Valorant" },
  { value: "Call of Duty Mobile", label: "Call of Duty Mobile", short: "COD Mobile" },
  { value: "EA SPORTS FC", label: "EA SPORTS FC" },
  { value: "Fortnite", label: "Fortnite" },
];
