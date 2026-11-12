// Rabasa owns. GET /gamers/:id/dashboard, shaped to the web app's GamerDashboard
// (web/src/types/api.ts, marked UNCONFIRMED there). The owner gets the wallet; a COACH or
// SPONSOR gets the summary only (no clips, no wallet); anyone else gets 403.
// `:id` is the User id first (the web links use it), then the gamer tag, then the profile id.
// Wallet balance = SUM(amountCents) over all of the user's entries (vault: Wallet Ledger).
import { AppError } from "../../lib/errors.js";
import { canReceiveDonations } from "../../lib/age.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTRY_LIMIT = 200;

export type ProfileRow = {
  id: string;
  userId: string;
  gamerTag: string;
  primaryGame: string;
  secondaryGames: string[];
  roles: string[];
  radScore: number;
  aiSkillSummary: string | null;
  visibility: boolean;
  /** dateOfBirth: self-declared at signup; optional so older callers and fixtures still fit. */
  user: { region: string | null; isVerifiedAdult: boolean; dateOfBirth?: Date | null };
};
export type EntryRow = {
  id: string;
  userId: string;
  amountCents: number;
  kind: string;
  paypalRef: string | null;
  createdAt: Date;
};

export type DashboardDeps = {
  findProfile: (idOrTag: string) => Promise<ProfileRow | null>;
  radHistory: (profileId: string) => Promise<{ recordedAt: Date; radScore: number }[]>;
  walletBalance: (userId: string) => Promise<number>;
  walletEntries: (userId: string, take: number) => Promise<EntryRow[]>;
};

/** GamerProfile in web/src/types/api.ts. */
function toWebProfile(p: ProfileRow) {
  return {
    id: p.id,
    userId: p.userId,
    gamerTags: [p.gamerTag],
    platforms: [] as string[],
    games: [p.primaryGame, ...p.secondaryGames],
    region: p.user.region,
    aiSummary: p.aiSkillSummary ? { summary: p.aiSkillSummary, strengths: [] as string[], roles: p.roles } : null,
    radScore: p.radScore,
    visibility: p.visibility ? "PUBLIC" : "PRIVATE",
    // Gates the Donate button, so it carries the same rule as POST /donations: verified, or 18+
    // by the date of birth given at signup (src/lib/age.ts). The birth date is never sent.
    isVerifiedAdult: canReceiveDonations({ isVerifiedAdult: p.user.isVerifiedAdult, dateOfBirth: p.user.dateOfBirth ?? null }),
  };
}

/** WalletEntry in web/src/types/api.ts: `amount` is the signed cents. */
export function toWebEntry(e: EntryRow) {
  return {
    id: e.id,
    userId: e.userId,
    amount: e.amountCents,
    kind: e.kind,
    paypalRef: e.paypalRef ?? "",
    createdAt: e.createdAt.toISOString(),
  };
}

/**
 * GET /gamers/:id, the public Gamer ID (no login needed). `viewerId` is set only when a valid
 * token was sent. A private profile (visibility = false) is shown to its owner alone.
 */
export async function getPublicProfile(deps: DashboardDeps, i: { viewerId?: string; id: string }) {
  const profile = await deps.findProfile(i.id);
  if (!profile) throw new AppError(404, "NOT_FOUND", "Gamer not found");
  if (!profile.visibility && profile.userId !== i.viewerId) {
    throw new AppError(403, "FORBIDDEN_ROLE", "This profile is private.");
  }
  return toWebProfile(profile);
}

/** GamerDashboard in web/src/types/api.ts. The wallet fields are absent for a non-owner. */
export type DashboardView = {
  profile: ReturnType<typeof toWebProfile>;
  radScoreHistory: { date: string; radScore: number }[];
  clips?: never[];
  walletBalance?: number;
  walletEntries?: ReturnType<typeof toWebEntry>[];
};

export async function getDashboard(
  deps: DashboardDeps,
  i: { viewerId: string; viewerRole: string; id: string },
): Promise<DashboardView> {
  const profile = await deps.findProfile(i.id);
  if (!profile) throw new AppError(404, "NOT_FOUND", "Gamer not found");

  const isOwner = profile.userId === i.viewerId;
  if (!isOwner && i.viewerRole !== "COACH" && i.viewerRole !== "SPONSOR") {
    throw new AppError(403, "FORBIDDEN_ROLE", "You can't view this dashboard.");
  }

  const history = await deps.radHistory(profile.id);
  const base = {
    profile: toWebProfile(profile),
    radScoreHistory: history.map((h) => ({ date: h.recordedAt.toISOString(), radScore: h.radScore })),
  };
  if (!isOwner) return base; // summary only

  const [walletBalance, entries] = await Promise.all([
    deps.walletBalance(profile.userId),
    deps.walletEntries(profile.userId, ENTRY_LIMIT),
  ]);
  // clips: [] for now. Clip cards are Obonyo's model; the wallet page doesn't need them.
  return { ...base, clips: [], walletBalance, walletEntries: entries.map(toWebEntry) };
}

/** Live wiring. Loaded lazily so importing this file never needs DATABASE_URL. */
export async function liveDashboardDeps(): Promise<DashboardDeps> {
  const { prisma } = await import("../../lib/prisma.js");
  return {
    findProfile: (idOrTag) =>
      prisma.gamerProfile.findFirst({
        // A non-UUID would make Prisma throw on the uuid columns, so it can only be a tag.
        where: UUID.test(idOrTag)
          ? { OR: [{ userId: idOrTag }, { id: idOrTag }] }
          : { gamerTag: idOrTag },
        select: {
          id: true,
          userId: true,
          gamerTag: true,
          primaryGame: true,
          secondaryGames: true,
          roles: true,
          radScore: true,
          aiSkillSummary: true,
          visibility: true,
          user: { select: { region: true, isVerifiedAdult: true, dateOfBirth: true } },
        },
      }),
    radHistory: (profileId) =>
      prisma.radScoreHistory.findMany({
        where: { profileId },
        orderBy: { recordedAt: "asc" },
        select: { recordedAt: true, radScore: true },
      }),
    walletBalance: async (userId) =>
      (await prisma.walletEntry.aggregate({ where: { userId }, _sum: { amountCents: true } }))._sum.amountCents ?? 0,
    walletEntries: (userId, take) =>
      prisma.walletEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take,
        select: { id: true, userId: true, amountCents: true, kind: true, paypalRef: true, createdAt: true },
      }),
  };
}
