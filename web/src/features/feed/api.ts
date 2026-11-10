import { api, ApiError } from "../../lib/api-client.ts";
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
  const body: VoteRequest = { direction };
  return api.post<VoteResponse>(`/api/v1/clips/${encodeURIComponent(clipId)}/vote`, body);
}

/**
 * UNCONFIRMED: README only says Vote is unique on (clipId, voterId). We assume the API
 * answers a repeat vote with 409. Change it here if Obonyo ships something else.
 */
export const ALREADY_VOTED_STATUS = 409;

export type VoteFailureKind = "already-voted" | "unavailable" | "failed";

export function classifyVoteError(error: unknown): VoteFailureKind {
  if (error instanceof ApiError) {
    if (error.status === ALREADY_VOTED_STATUS) return "already-voted";
    if (error.code === API_ERROR_CODE.NOT_FOUND) return "unavailable";
  }
  return "failed";
}
