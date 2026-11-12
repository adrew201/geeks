import { api, ApiError } from "../../lib/api-client.ts";
import { getSession } from "../../lib/session.ts";
import {
  API_ERROR_CODE,
  type FeedPage,
  type VoteDirection,
  type VoteRequest,
  type VoteResponse,
} from "../../types/api.ts";

// README §14: GET /api/v1/feed?cursor= and POST /api/v1/clips/:id/vote (both Obonyo).

export function fetchFeed(cursor: string | null, signal?: AbortSignal): Promise<FeedPage> {
  return api.get<FeedPage>("/api/v1/feed", { query: { cursor }, signal });
}

export function voteOnClip(clipId: string, direction: VoteDirection): Promise<VoteResponse> {
  // The API takes the voter from the JWT and rejects extra fields (additionalProperties: false),
  // so the body is direction only. Signed-out users are refused here, before the request.
  if (!getSession()?.userId) {
    return Promise.reject(new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to vote."));
  }
  const body: VoteRequest = { direction };
  return api.post<VoteResponse>(`/api/v1/clips/${encodeURIComponent(clipId)}/vote`, body);
}

/**
 * The API currently accepts a repeat vote (no-op or switch), so this never fires against it.
 * Kept for the mocks and in case Obonyo adds a 409 for repeats.
 */
export const ALREADY_VOTED_STATUS = 409;
const NOT_FOUND_STATUS = 404;

export type VoteFailureKind = "already-voted" | "unavailable" | "failed";

export function classifyVoteError(error: unknown): VoteFailureKind {
  if (error instanceof ApiError) {
    if (error.status === ALREADY_VOTED_STATUS) return "already-voted";
    // By status: the clip routes send `{ error: "clip not found" }`, which has no code.
    if (error.status === NOT_FOUND_STATUS) return "unavailable";
  }
  return "failed";
}
