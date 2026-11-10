import { describe, expect, it } from "vitest";
import { RAD_SCORE_WEIGHTS, radScore, type RadScoreInputs } from "./radScore.js";

const floor: RadScoreInputs = {
  elo: 800,
  bountiesWon: 0,
  tournamentWins: 0,
  endorsements: 0,
  aiQualityScore: 0,
  engagement: 0,
};

const caps: RadScoreInputs = {
  elo: 1600,
  bountiesWon: 5,
  tournamentWins: 3,
  endorsements: 3,
  aiQualityScore: 100,
  engagement: 1000,
};

const newGamer: RadScoreInputs = { ...floor, elo: 1200 };

describe("radScore", () => {
  it("has weights that sum to 1", () => {
    const sum = Object.values(RAD_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  it("is 0 at every floor and 100 at every cap", () => {
    expect(radScore(floor)).toBeCloseTo(0);
    expect(radScore(caps)).toBeCloseTo(100);
  });

  it("stays within 0-100 for out-of-range inputs", () => {
    const low = radScore({ ...floor, elo: 100, aiQualityScore: -5 });
    const high = radScore({
      elo: 3000,
      bountiesWon: 50,
      tournamentWins: 20,
      endorsements: 10,
      aiQualityScore: 150,
      engagement: 99999,
    });
    expect(low).toBeCloseTo(0);
    expect(high).toBeCloseTo(100);
  });

  it("gives a new gamer credit for baseline Elo and AI quality", () => {
    expect(radScore(newGamer)).toBeCloseTo(12.5);
    expect(radScore({ ...newGamer, aiQualityScore: 80 })).toBeCloseTo(20.5);
  });

  it("rises with a bounty win", () => {
    expect(radScore({ ...newGamer, bountiesWon: 1 })).toBeGreaterThan(radScore(newGamer));
  });
});
