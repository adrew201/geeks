import type { Clip } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { clipAnalysisQueue } from "../../lib/queues.js";
import { recordVote, recomputeRadScore } from "../../lib/ranking/index.js";

export interface CreateClipInput {
  gamerId: string;
  title: string;
  videoUrl: string;
  description?: string;
  game?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

// Temporary: gamerId comes from the request body until auth lands,
// then it comes from the JWT user. Flagged for the auth handoff.
export async function createClip(input: CreateClipInput) {
  const gamer = await prisma.user.findUnique({ where: { id: input.gamerId } });
  if (!gamer) {
    throw Object.assign(new Error("gamer not found"), { statusCode: 404 });
  }
  const clip = await prisma.clip.create({
    data: {
      gamerId: input.gamerId,
      title: input.title,
      videoUrl: input.videoUrl,
      description: input.description,
      game: input.game ?? "Valorant",
      durationSeconds: input.durationSeconds,
    },
  });
  await clipAnalysisQueue.add("api", {
    clipId: clip.id,
    thumbnailUrl: input.thumbnailUrl,
    description: clip.description ?? undefined,
    game: clip.game,
    durationSeconds: clip.durationSeconds ?? undefined,
  });
  return clip;
}

// README §13 Clip shape that web/src/types/api.ts reads. DB column names differ.
export function toApiClip(row: Clip) {
  return {
    id: row.id,
    ownerId: row.gamerId,
    url: row.videoUrl,
    description: row.description ?? "",
    game: row.game,
    tags: row.aiTags,
    stats: null, // not stored yet
    keyMoments: Array.isArray(row.aiKeyMoments) ? row.aiKeyMoments : [],
    aiQualityScore: row.aiQualityScore,
    eloRating: row.eloRating,
    status: row.aiAnalysisStatus === "COMPLETED" ? "ANALYSED" : "PENDING",
  };
}

const FEED_PAGE_SIZE = 20;

// GET /api/v1/feed?cursor= (README §14). Cursor is an offset into the Elo-ranked list.
// Ads and "exclude own clips" come with the ads and auth work.
export async function getFeedPage(cursor?: string, game?: string) {
  const skip = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
  const rows = await prisma.clip.findMany({
    where: { status: "ACTIVE", ...(game ? { game } : {}) },
    orderBy: [{ eloRating: "desc" }, { createdAt: "desc" }],
    skip,
    take: FEED_PAGE_SIZE + 1,
    include: {
      gamer: {
        select: { displayName: true, region: true, profile: { select: { gamerTag: true, radScore: true } } },
      },
    },
  });
  const page = rows.slice(0, FEED_PAGE_SIZE);
  return {
    items: page.map(({ gamer, ...clip }) => ({
      kind: "clip" as const,
      clip: toApiClip(clip),
      owner: {
        gamerId: clip.gamerId,
        gamerTag: gamer.profile?.gamerTag ?? gamer.displayName,
        region: gamer.region,
        radScore: gamer.profile?.radScore ?? 0,
      },
    })),
    nextCursor: rows.length > FEED_PAGE_SIZE ? String(skip + FEED_PAGE_SIZE) : null,
  };
}

export function getFeed(game?: string) {
  return prisma.clip.findMany({
    where: { status: "ACTIVE", ...(game ? { game } : {}) },
    orderBy: [{ eloRating: "desc" }],
    take: 20,
  });
}

export interface VoteInput {
  clipId: string;
  voterId: string;
  direction: "UP" | "DOWN";
}

export async function voteOnClip({ clipId, voterId, direction }: VoteInput) {
  const clip = await prisma.clip.findUnique({ where: { id: clipId } });
  if (!clip) {
    throw Object.assign(new Error("clip not found"), { statusCode: 404 });
  }
  const voteType = direction === "UP" ? "UPVOTE" : "DOWNVOTE";

  const existing = await prisma.swipeVote.findUnique({
    where: { voterId_clipId: { voterId, clipId } },
  });
  if (!existing) {
    // recordVote writes the vote, Elo and counts, then recomputes the owner's rad score.
    try {
      await recordVote(clipId, voterId, voteType);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        throw Object.assign(new Error("voter not found"), { statusCode: 404 });
      }
      if (code === "P2002") {
        throw Object.assign(new Error("already voted"), { statusCode: 409 });
      }
      throw err;
    }
  } else if (existing.voteType !== voteType) {
    // Changed vote: swap the counts only. Elo isn't re-run for a flip.
    await prisma.$transaction([
      prisma.swipeVote.update({ where: { id: existing.id }, data: { voteType } }),
      prisma.clip.update({
        where: { id: clipId },
        data:
          direction === "UP"
            ? { upvoteCount: { increment: 1 }, downvoteCount: { decrement: 1 } }
            : { upvoteCount: { decrement: 1 }, downvoteCount: { increment: 1 } },
      }),
    ]);
    await recomputeRadScore(clip.gamerId, "Vote Changed");
  } else {
    // Same vote again: web treats 409 as "already voted".
    throw Object.assign(new Error("already voted"), { statusCode: 409 });
  }

  const profile = await prisma.gamerProfile.findUnique({
    where: { userId: clip.gamerId },
    select: { radScore: true },
  });
  return {
    clip: toApiClip(await prisma.clip.findUniqueOrThrow({ where: { id: clipId } })),
    radScore: profile?.radScore ?? null,
  };
}
