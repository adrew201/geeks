import { describe, expect, it } from "vitest";
import { parseVerdict } from "../bountyVerification.js";

describe("parseVerdict", () => {
  it("parses a full Claude answer, fenced or not", () => {
    const raw =
      '```json\n{"pass":true,"confidence":0.86,"matchesGame":true,"taskCompleted":true,"looksReused":false,"reason":"Clip shows a 1v3 round win in Valorant."}\n```';
    const out = parseVerdict(raw);
    expect(out.pass).toBe(true);
    expect(out.confidence).toBe(0.86);
    expect(out.reason).toContain("1v3");
  });

  it("defaults missing flags, keeps the pass boolean", () => {
    const out = parseVerdict('{"pass":false,"reason":"Wrong game."}');
    expect(out.pass).toBe(false);
    expect(out.confidence).toBe(0);
    expect(out.matchesGame).toBe(false);
  });

  it("throws when pass is missing so the worker retries", () => {
    expect(() => parseVerdict('{"confidence":0.9}')).toThrow();
    expect(() => parseVerdict("not json")).toThrow();
  });
});
