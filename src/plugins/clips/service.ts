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
    await prisma.swipeVote.create({ data: { voterId, clipId, voteType } });
    await prisma.clip.update({
      where: { id: clipId },
      data:
        direction === "UP"
          ? { upvoteCount: { increment: 1 } }
          : { downvoteCount: { increment: 1 } },
    });
  } else if (existing.voteType !== voteType) {
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
  }

  // Ranking is Fabiola's and still a stub that throws. The vote is saved
  // regardless; ranking lights up when her functions land.
  let radScore: number | null = null;
  try {
    await recordVote(clipId, voterId, direction);
    radScore = await recomputeRadScore(clip.gamerId);
  } catch (err) {
    console.log("ranking not ready yet:", String(err));
  }
  return { clip: await prisma.clip.findUniqueOrThrow({ where: { id: clipId } }), radScore };
}
