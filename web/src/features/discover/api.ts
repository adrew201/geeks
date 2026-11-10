import { api } from "../../lib/api-client.ts";
import type { CoachMatch } from "../../types/api.ts";

// README §14 (Obonyo): GET /api/v1/coach/matches, COACH only, "AI talent matches".
// UNCONFIRMED response: CoachMatch[] (types/api.ts). `gamerId` is assumed to be an id that
// GET /gamers/:id accepts, like the leaderboard's.
export function fetchCoachMatches(signal?: AbortSignal): Promise<CoachMatch[]> {
  return api.get<CoachMatch[]>("/api/v1/coach/matches", { signal });
}
