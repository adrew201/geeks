// Placeholder weights until the team agrees them. They sum to 1, so the score is 0-100.
export const RAD_SCORE_WEIGHTS = {
  elo: 0.25,
  bountiesWon: 0.3,
  tournamentWins: 0.1,
  endorsements: 0.15,
  aiQualityScore: 0.1,
  engagement: 0.1,
};

// Placeholder ranges each input is scaled across to reach 0-100.
const ELO_FLOOR = 800;
const ELO_CEILING = 1600;
const BOUNTIES_CAP = 5;
const TOURNAMENTS_CAP = 3;
const ENDORSEMENTS_CAP = 3;
const ENGAGEMENT_CAP = 1000;

export type RadScoreInputs = {
  elo: number;
  bountiesWon: number; // excludes tournaments
  tournamentWins: number;
  endorsements: number; // sum of CoachEndorsement.weightMultiplier
  aiQualityScore: number; // already 0-100
  engagement: number; // clip views + votes
};

function scale(value: number, floor: number, ceiling: number): number {
  const clamped = Math.min(Math.max(value, floor), ceiling);
  return ((clamped - floor) / (ceiling - floor)) * 100;
}

export function radScore(inputs: RadScoreInputs): number {
  const w = RAD_SCORE_WEIGHTS;
  return (
    w.elo * scale(inputs.elo, ELO_FLOOR, ELO_CEILING) +
    w.bountiesWon * scale(inputs.bountiesWon, 0, BOUNTIES_CAP) +
    w.tournamentWins * scale(inputs.tournamentWins, 0, TOURNAMENTS_CAP) +
    w.endorsements * scale(inputs.endorsements, 0, ENDORSEMENTS_CAP) +
    w.aiQualityScore * scale(inputs.aiQualityScore, 0, 100) +
    w.engagement * scale(inputs.engagement, 0, ENGAGEMENT_CAP)
  );
}
