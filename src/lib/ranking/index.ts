// Fabiola owns. Called by clips (after a vote) and bounties (after a payout).
import type { VoteType } from "@prisma/client";
import { prisma } from "../prisma.js";
import { BASELINE_ELO, updateElo, voterWeight } from "./elo.js";
import { radScore } from "./radScore.js";

// Writes the SwipeVote, updates the clip's Elo and counts, then recomputes the owner's rad score.
// Throws P2002 on a duplicate vote and P2025 on an unknown clip or voter.
export async function recordVote(clipId: string, voterId: string, voteType: VoteType): Promise<void> {
  const gamerId = await prisma.$transaction(async (tx) => {
    const clip = await tx.clip.findUniqueOrThrow({
      where: { id: clipId },
      select: { eloRating: true, upvoteCount: true, downvoteCount: true, gamerId: true },
    });
    const voter = await tx.user.findUniqueOrThrow({ where: { id: voterId }, select: { role: true } });

    const weight = voterWeight(voter.role);
    const newElo = updateElo({
      rating: clip.eloRating,
      voteCount: clip.upvoteCount + clip.downvoteCount,
      voteType,
      voterWeight: weight,
    });

    await tx.swipeVote.create({
      data: { voterId, clipId, voteType, voterWeight: weight, previousElo: clip.eloRating, newElo },
    });
    await tx.clip.update({
      where: { id: clipId },
      data: {
        eloRating: newElo,
        ...(voteType === "UPVOTE" ? { upvoteCount: { increment: 1 } } : { downvoteCount: { increment: 1 } }),
      },
    });
    return clip.gamerId;
  });

  await recomputeRadScore(gamerId, "Community Vote");
}

function average(values: number[], fallback: number): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : fallback;
}

// Returns the gamer's new rad score. Writes nothing if the gamer has no GamerProfile yet.
export async function recomputeRadScore(gamerId: string, reason = "Recompute"): Promise<number> {
  const [clips, bountiesWon, tournamentWins, endorsements, profile] = await Promise.all([
    prisma.clip.findMany({
      where: { gamerId, status: "ACTIVE" },
      select: {
        eloRating: true,
        aiQualityScore: true,
        aiAnalysisStatus: true,
        viewCount: true,
        upvoteCount: true,
        downvoteCount: true,
      },
    }),
    prisma.bounty.count({ where: { winnerId: gamerId, status: "COMPLETED", bountyType: { not: "TOURNAMENT" } } }),
    prisma.bounty.count({ where: { winnerId: gamerId, status: "COMPLETED", bountyType: "TOURNAMENT" } }),
    prisma.coachEndorsement.aggregate({ where: { gamerId }, _sum: { weightMultiplier: true } }),
    prisma.gamerProfile.findUnique({ where: { userId: gamerId }, select: { id: true } }),
  ]);

  const elo = average(clips.map((c) => c.eloRating), BASELINE_ELO);
  const analysed = clips.filter((c) => c.aiAnalysisStatus === "COMPLETED" && c.aiQualityScore !== null);

  const score = radScore({
    elo,
    bountiesWon,
    tournamentWins,
    endorsements: endorsements._sum.weightMultiplier ?? 0,
    aiQualityScore: average(analysed.map((c) => c.aiQualityScore as number), 0),
    engagement: clips.reduce((sum, c) => sum + c.viewCount + c.upvoteCount + c.downvoteCount, 0),
  });

  if (profile) {
    await prisma.$transaction([
      prisma.gamerProfile.update({
        where: { id: profile.id },
        data: { radScore: score, currentElo: elo, lastEloUpdate: new Date() },
      }),
      prisma.radScoreHistory.create({
        data: { profileId: profile.id, radScore: score, eloRating: elo, changeReason: reason },
      }),
    ]);
  }

  return score;
}
