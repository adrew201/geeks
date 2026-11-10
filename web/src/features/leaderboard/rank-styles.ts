import { RAD_SCORE_LABEL } from "../../config/labels.ts";

// 10D/10M rank colours: #1 gold, #2 silver (= fg-secondary), #3 bronze, signed-in user primary.
export function rankTextClass(rank: number, isMe: boolean): string {
  if (isMe) return "text-primary";
  if (rank === 1) return "text-rank-gold";
  if (rank === 2) return "text-fg-secondary";
  if (rank === 3) return "text-rank-bronze";
  return "text-fg";
}

const numberFormat = new Intl.NumberFormat("en-US");

/** 9420 → "9,420" (10D score formatting). */
export function formatScore(score: number): string {
  return numberFormat.format(score);
}

/** "Valorant • Kenya", or just the game when region is null. */
export function gameAndRegion(game: string, region: string | null): string {
  return region ? `${game} • ${region}` : game;
}

/** Decision 5: every "Ranking Score" in 10D/10M is the rad score. */
export const SCORE_LABEL = RAD_SCORE_LABEL;
