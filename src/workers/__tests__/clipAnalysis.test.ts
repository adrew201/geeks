import { describe, expect, it } from "vitest";
import { parseResult, stripFences } from "../clipAnalysis.js";

describe("stripFences", () => {
  it("unwraps ```json fences", () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("leaves plain JSON alone", () => {
    expect(stripFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe("parseResult", () => {
  it("parses a full Claude answer, fenced or not", () => {
    const raw = '```json\n{"game":"Valorant","keyMoments":[{"t":"0:07","label":"1v3 clutch"}],"stats":{"kills":3},"tags":["clutch"],"aiQualityScore":78}\n```';
    const out = parseResult(raw);
    expect(out.game).toBe("Valorant");
    expect(out.keyMoments).toHaveLength(1);
    expect(out.stats).toEqual({ kills: 3 });
    expect(out.tags).toEqual(["clutch"]);
    expect(out.aiQualityScore).toBe(78);
  });

  it("defaults missing or wrong-typed fields instead of throwing", () => {
    const out = parseResult('{"game":42,"tags":["ok",7]}');
    expect(out.game).toBe("Unknown");
    expect(out.keyMoments).toEqual([]);
    expect(out.tags).toEqual(["ok"]);
    expect(out.aiQualityScore).toBe(0);
  });

  it("throws on unparseable output so the worker can retry", () => {
    expect(() => parseResult("not json at all")).toThrow();
  });
});
