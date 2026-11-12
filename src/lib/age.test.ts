import { describe, expect, it } from "vitest";
import { ageOn, canReceiveDonations } from "./age.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("ageOn", () => {
  it("counts whole years and turns over on the birthday", () => {
    expect(ageOn(d("2008-11-12"), d("2026-11-11"))).toBe(17);
    expect(ageOn(d("2008-11-12"), d("2026-11-12"))).toBe(18);
    expect(ageOn(d("2008-02-29"), d("2026-02-28"))).toBe(17);
    expect(ageOn(d("2008-02-29"), d("2026-03-01"))).toBe(18);
  });
});

describe("canReceiveDonations", () => {
  const now = d("2026-11-12");
  it("allows verified adults, with or without a date of birth", () => {
    expect(canReceiveDonations({ isVerifiedAdult: true, dateOfBirth: null }, now)).toBe(true);
    expect(canReceiveDonations({ isVerifiedAdult: true, dateOfBirth: d("2015-01-01") }, now)).toBe(true);
  });
  it("allows 18+ by date of birth and refuses under-18s and missing dates", () => {
    expect(canReceiveDonations({ isVerifiedAdult: false, dateOfBirth: d("2008-11-12") }, now)).toBe(true);
    expect(canReceiveDonations({ isVerifiedAdult: false, dateOfBirth: d("2008-11-13") }, now)).toBe(false);
    expect(canReceiveDonations({ isVerifiedAdult: false, dateOfBirth: null }, now)).toBe(false);
  });
});
