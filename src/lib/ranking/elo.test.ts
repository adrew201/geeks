import { describe, expect, it } from "vitest";
import { BASELINE_ELO, expectedScore, kFactor, updateElo, voterWeight } from "./elo.js";

describe("voterWeight", () => {
  it("counts coaches at 2.5 and everyone else at 1", () => {
    expect(voterWeight("COACH")).toBe(2.5);
    expect(voterWeight("GAMER_FREE")).toBe(1);
    expect(voterWeight("GAMER_PAID")).toBe(1);
    expect(voterWeight("SPONSOR")).toBe(1);
  });
});

describe("expectedScore", () => {
  it("is 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBe(0.5);
  });

  it("sums to 1 for both sides", () => {
    expect(expectedScore(1400, 1100) + expectedScore(1100, 1400)).toBeCloseTo(1);
  });
});

describe("kFactor", () => {
  it("is higher for new clips", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(9)).toBe(40);
    expect(kFactor(10)).toBe(20);
  });
});

describe("updateElo", () => {
  const base = { rating: BASELINE_ELO, voteCount: 0, voterWeight: 1 };

  it("moves a new clip by 20 on its first vote", () => {
    expect(updateElo({ ...base, voteType: "UPVOTE" })).toBe(1220);
    expect(updateElo({ ...base, voteType: "DOWNVOTE" })).toBe(1180);
  });

  it("scales the change by voter weight", () => {
    const light = updateElo({ ...base, voteType: "UPVOTE" }) - BASELINE_ELO;
    const heavy = updateElo({ ...base, voteType: "UPVOTE", voterWeight: 2.5 }) - BASELINE_ELO;
    expect(heavy).toBeCloseTo(light * 2.5);
  });

  it("moves a new clip more than an established one", () => {
    const fresh = updateElo({ ...base, voteType: "UPVOTE" });
    const established = updateElo({ ...base, voteType: "UPVOTE", voteCount: 50 });
    expect(fresh).toBeGreaterThan(established);
  });

  it("gives a high-rated clip less for an upvote than a low-rated one", () => {
    const highGain = updateElo({ ...base, rating: 1500, voteType: "UPVOTE" }) - 1500;
    const lowGain = updateElo({ ...base, rating: 1000, voteType: "UPVOTE" }) - 1000;
    expect(highGain).toBeLessThan(lowGain);
  });
});
