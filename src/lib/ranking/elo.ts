import type { Role, VoteType } from "@prisma/client";

// Opponent rating for every vote. Matches the schema default for Clip.eloRating.
export const BASELINE_ELO = 1200;

// Placeholder values until the team agrees them.
const K_NEW = 40;
const K_ESTABLISHED = 20;
const NEW_CLIP_VOTES = 10;

// Matches the SwipeVote.voterWeight schema comment: coaches count more.
export function voterWeight(role: Role): number {
  return role === "COACH" ? 2.5 : 1;
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function kFactor(voteCount: number): number {
  return voteCount < NEW_CLIP_VOTES ? K_NEW : K_ESTABLISHED;
}

export function updateElo(input: {
  rating: number;
  voteCount: number;
  voteType: VoteType;
  voterWeight: number;
}): number {
  const score = input.voteType === "UPVOTE" ? 1 : 0;
  const expected = expectedScore(input.rating, BASELINE_ELO);
  return input.rating + kFactor(input.voteCount) * input.voterWeight * (score - expected);
}
