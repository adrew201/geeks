// Fabiola owns. Called by clips (after a vote) and bounties (after a payout).
export async function recordVote(clipId: string, voterId: string, direction: "UP" | "DOWN"): Promise<void> {
  throw new Error("recordVote not implemented");
}
export async function recomputeRadScore(gamerId: string): Promise<number> {
  throw new Error("recomputeRadScore not implemented");
}
