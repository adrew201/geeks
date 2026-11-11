import { usesRealApi } from "../../config/env.ts";
import { api, ApiError } from "../../lib/api-client.ts";
import { toClip } from "../../lib/clip-adapter.ts";
import { getSession } from "../../lib/session.ts";
import {
  API_ERROR_CODE,
  type ApiClip,
  type Clip,
  type CreateClipRequest,
  type CreateClipResponse,
} from "../../types/api.ts";

// POST /api/v1/clips (Obonyo, src/plugins/clips/routes.ts): 201 with the clip row, analysis
// queued. The API has no GET /clips/:id, so a real submission can't be tracked past "queued".

const CLIPS_PATH = "/api/v1/clips";

export function submitClip(draft: Omit<CreateClipRequest, "gamerId">, signal?: AbortSignal): Promise<Clip> {
  // TODO: gamerId should come from the JWT once Obonyo changes the routes.
  const gamerId = getSession()?.userId;
  if (!gamerId) {
    return Promise.reject(new ApiError(401, API_ERROR_CODE.UNAUTHENTICATED, "Please log in to submit a clip."));
  }
  const body: CreateClipRequest = { gamerId, ...draft };
  return api.post<CreateClipResponse>(CLIPS_PATH, body, { signal }).then(toClip);
}

/** True only in mock mode: the mocks answer GET /clips/:id so the whole timeline can play. */
export const canTrackClip = !usesRealApi(CLIPS_PATH);

/** MOCK ONLY: the real API has no such route (see canTrackClip). */
export function fetchClip(id: string, signal?: AbortSignal): Promise<Clip> {
  return api.get<ApiClip>(`${CLIPS_PATH}/${encodeURIComponent(id)}`, { signal }).then(toClip);
}
