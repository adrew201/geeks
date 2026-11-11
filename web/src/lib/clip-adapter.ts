import { CLIP_STATUS, type ApiClip, type Clip, type ClipKeyMoment, type ClipStatus } from "../types/api.ts";

// The only place that reads the API's clip shape (ApiClip). Everything else uses Clip.

function toClipStatus(raw: string): ClipStatus {
  // An unknown value counts as PENDING: never shown as analysed.
  return Object.values(CLIP_STATUS).find((status) => status === raw) ?? CLIP_STATUS.PENDING;
}

function toKeyMoments(raw: unknown): ClipKeyMoment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (moment): moment is ClipKeyMoment =>
      typeof moment === "object" &&
      moment !== null &&
      typeof (moment as ClipKeyMoment).t === "string" &&
      typeof (moment as ClipKeyMoment).label === "string",
  );
}

export function toClip(raw: ApiClip): Clip {
  const status = toClipStatus(raw.aiAnalysisStatus);
  const analysed = status === CLIP_STATUS.COMPLETED;
  return {
    id: raw.id,
    ownerId: raw.gamerId,
    url: raw.videoUrl,
    title: raw.title,
    description: raw.description ?? "",
    game: raw.game,
    tags: raw.aiTags ?? [],
    stats: null,
    keyMoments: toKeyMoments(raw.aiKeyMoments),
    // The column defaults to 0, so a score before analysis is not a real score.
    aiQualityScore: analysed ? (raw.aiQualityScore ?? null) : null,
    eloRating: raw.eloRating,
    status,
  };
}
