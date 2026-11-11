import { describe, expect, it } from "vitest";
import { parseSummary } from "../skillSummary.js";

describe("parseSummary", () => {
  it("parses a full Claude answer, fenced or not", () => {
    const raw =
      '```json\n{"summary":"Aggressive duelist with strong clutch play.","strengths":["clutch","aim"],"roles":["Duelist"]}\n```';
    const out = parseSummary(raw);
    expect(out.summary).toContain("duelist");
    expect(out.strengths).toEqual(["clutch", "aim"]);
    expect(out.roles).toEqual(["Duelist"]);
  });

  it("defaults missing strengths and roles", () => {
    const out = parseSummary('{"summary":"New gamer, few clips yet."}');
    expect(out.strengths).toEqual([]);
    expect(out.roles).toEqual([]);
  });

  it("throws when summary text is missing so the worker retries", () => {
    expect(() => parseSummary('{"strengths":["aim"]}')).toThrow();
    expect(() => parseSummary("not json")).toThrow();
  });
});
