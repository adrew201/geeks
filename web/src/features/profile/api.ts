import { api, ApiError } from "../../lib/api-client.ts";
import type { Session } from "../../lib/session.ts";
import {
  API_ERROR_CODE,
  type GamerDashboard,
  type GamerProfile,
  type UpdateGamerProfileRequest,
} from "../../types/api.ts";

// README §14 (Rabasa):
//   GET /api/v1/gamers/:id            none                         Public Gamer ID
//   GET /api/v1/gamers/:id/dashboard  owner, COACH, SPONSOR        Stats (sponsor: summary)
// The JWT is sent when signed in so the API can recognise the owner and the viewer's role.

function gamerPath(gamerId: string): string {
  return `/api/v1/gamers/${encodeURIComponent(gamerId)}`;
}

export function fetchGamerProfile(gamerId: string, signal?: AbortSignal): Promise<GamerProfile> {
  return api.get<GamerProfile>(gamerPath(gamerId), { signal });
}

export function fetchGamerDashboard(gamerId: string, signal?: AbortSignal): Promise<GamerDashboard> {
  return api.get<GamerDashboard>(`${gamerPath(gamerId)}/dashboard`, { signal });
}

/**
 * UNCONFIRMED endpoint: README §14 has no write route for GamerProfile. PATCH on the Gamer ID
 * is assumed, returning the updated profile. Ask Rabasa; change it here only.
 */
export function updateGamerProfile(gamerId: string, body: UpdateGamerProfileRequest): Promise<GamerProfile> {
  return api.patch<GamerProfile>(gamerPath(gamerId), body);
}

/**
 * The id /passport loads for the signed-in gamer. UNCONFIRMED: the JWT carries `userId`,
 * not the GamerProfile id (README §18), so this assumes GET /gamers/:id accepts a userId.
 * If the API adds `gamerId` to the token or a /gamers/me route, change it here only.
 */
export function ownGamerId(session: Session): string {
  return session.userId;
}

export type LoadFailure = "not-found" | "restricted" | "failed";

/**
 * 404 → not found. 403 on the Gamer ID → restricted: the only public route that can refuse
 * is a private profile (UNCONFIRMED: README has no visibility rule; the code may differ).
 */
export function classifyLoadError(error: unknown): LoadFailure {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.code === API_ERROR_CODE.NOT_FOUND) return "not-found";
    if (error.status === 403) return "restricted";
  }
  return "failed";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
