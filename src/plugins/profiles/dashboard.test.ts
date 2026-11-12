import { describe, expect, it } from "vitest";
import { getDashboard, getPublicProfile, type DashboardDeps, type ProfileRow } from "./dashboard.js";

const profile: ProfileRow = {
  id: "prof-1",
  userId: "user-1",
  gamerTag: "ShadowViper",
  primaryGame: "Valorant",
  secondaryGames: ["CS2"],
  roles: ["Duelist"],
  radScore: 88.5,
  aiSkillSummary: "Sharp entry fragger.",
  visibility: true,
  user: { region: "KE", isVerifiedAdult: true },
};

const deps = (over: Partial<DashboardDeps> = {}): DashboardDeps => ({
  findProfile: async () => profile,
  radHistory: async () => [{ recordedAt: new Date("2026-11-01T00:00:00Z"), radScore: 80 }],
  walletBalance: async () => 950,
  walletEntries: async () => [
    { id: "e1", userId: "user-1", amountCents: 1000, kind: "DONATION", paypalRef: "CAP-1", createdAt: new Date(0) },
    { id: "e2", userId: "user-1", amountCents: -50, kind: "FEE", paypalRef: null, createdAt: new Date(0) },
  ],
  ...over,
});

describe("getDashboard", () => {
  it("gives the owner the wallet: balance from the ledger sum and entries in the web shape", async () => {
    const d = await getDashboard(deps(), { viewerId: "user-1", viewerRole: "GAMER", id: "user-1" });
    expect(d.walletBalance).toBe(950);
    expect(d.walletEntries).toEqual([
      { id: "e1", userId: "user-1", amount: 1000, kind: "DONATION", paypalRef: "CAP-1", createdAt: "1970-01-01T00:00:00.000Z" },
      { id: "e2", userId: "user-1", amount: -50, kind: "FEE", paypalRef: "", createdAt: "1970-01-01T00:00:00.000Z" },
    ]);
    expect(d.profile).toMatchObject({
      gamerTags: ["ShadowViper"],
      games: ["Valorant", "CS2"],
      isVerifiedAdult: true,
      visibility: "PUBLIC",
    });
    expect(d.radScoreHistory).toEqual([{ date: "2026-11-01T00:00:00.000Z", radScore: 80 }]);
  });

  it("returns a zero balance and no entries for a gamer with an empty ledger", async () => {
    const d = await getDashboard(deps({ walletBalance: async () => 0, walletEntries: async () => [] }), {
      viewerId: "user-1",
      viewerRole: "GAMER",
      id: "user-1",
    });
    expect(d.walletBalance).toBe(0);
    expect(d.walletEntries).toEqual([]);
  });

  it("gives a coach the summary only: no wallet fields", async () => {
    const d = await getDashboard(deps(), { viewerId: "coach-1", viewerRole: "COACH", id: "user-1" });
    expect(d).not.toHaveProperty("walletBalance");
    expect(d).not.toHaveProperty("walletEntries");
  });

  it("refuses another gamer with 403 and an unknown gamer with 404", async () => {
    await expect(getDashboard(deps(), { viewerId: "user-2", viewerRole: "GAMER", id: "user-1" })).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      getDashboard(deps({ findProfile: async () => null }), { viewerId: "user-1", viewerRole: "GAMER", id: "x" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("getPublicProfile", () => {
  it("shows a public profile to anyone, with isVerifiedAdult so the Donate button can gate", async () => {
    const p = await getPublicProfile(deps(), { id: "user-1" });
    expect(p).toMatchObject({ id: "prof-1", gamerTags: ["ShadowViper"], isVerifiedAdult: true });
  });

  it("hides a private profile from visitors and other users but not from its owner", async () => {
    const priv = deps({ findProfile: async () => ({ ...profile, visibility: false }) });
    await expect(getPublicProfile(priv, { id: "user-1" })).rejects.toMatchObject({ status: 403 });
    await expect(getPublicProfile(priv, { id: "user-1", viewerId: "user-2" })).rejects.toMatchObject({ status: 403 });
    await expect(getPublicProfile(priv, { id: "user-1", viewerId: "user-1" })).resolves.toMatchObject({
      visibility: "PRIVATE",
    });
  });

  it("answers 404 for an unknown gamer", async () => {
    await expect(getPublicProfile(deps({ findProfile: async () => null }), { id: "x" })).rejects.toMatchObject({
      status: 404,
    });
  });
});
