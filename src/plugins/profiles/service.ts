import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { getWallet } from "../payments/wallet.js";
import { canReceiveDonations } from "../../lib/age.js";

// Public Gamer ID (GET /gamers/:id) and the gamer dashboard (GET /gamers/:id/dashboard), in
// the shape the web app's GamerProfile / GamerDashboard types expect (web/src/types/api.ts).
// `:id` may be the GamerProfile id or the gamer's user id: the leaderboard, feed and donation
// links use the user id.

export interface Viewer {
  sub: string;
  role: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findProfile(id: string) {
  if (!UUID.test(id)) throw new AppError(404, "GAMER_NOT_FOUND", "Gamer not found");
  const profile = await prisma.gamerProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: { user: { select: { region: true, isVerifiedAdult: true, dateOfBirth: true } } },
  });
  if (!profile) throw new AppError(404, "GAMER_NOT_FOUND", "Gamer not found");
  return profile;
}

type ProfileRow = Awaited<ReturnType<typeof findProfile>>;

function toGamerProfile(p: ProfileRow) {
  return {
    id: p.id,
    userId: p.userId,
    gamerTags: [p.gamerTag],
    platforms: [] as string[],
    games: [p.primaryGame, ...p.secondaryGames],
    region: p.user.region,
    aiSummary: p.aiSkillSummary ? { summary: p.aiSkillSummary, strengths: [] as string[], roles: p.roles } : null,
    radScore: p.radScore,
    visibility: p.visibility ? ("PUBLIC" as const) : ("PRIVATE" as const),
    // The web app hides the donate button when this is false, so it carries the donation rule
    // (verified, or 18+ by date of birth). The birth date itself is never exposed.
    isVerifiedAdult: canReceiveDonations(p.user),
  };
}

export async function getGamerProfile(id: string, viewer: Viewer | null) {
  const p = await findProfile(id);
  if (!p.visibility && viewer?.sub !== p.userId) {
    throw new AppError(403, "FORBIDDEN_ROLE", "This profile is private");
  }
  return toGamerProfile(p);
}

/** Owner gets everything incl. wallet; COACH gets stats; SPONSOR gets the summary only. */
export async function getGamerDashboard(id: string, viewer: Viewer) {
  const p = await findProfile(id);
  const owner = viewer.sub === p.userId;
  if (!owner && viewer.role !== "COACH" && viewer.role !== "SPONSOR") {
    throw new AppError(403, "FORBIDDEN_ROLE", "You can't view this dashboard");
  }
  const history = await prisma.radScoreHistory.findMany({
    where: { profileId: p.id },
    orderBy: { recordedAt: "asc" },
    take: 90,
    select: { recordedAt: true, radScore: true },
  });
  const summary = {
    profile: toGamerProfile(p),
    radScoreHistory: history.map((h) => ({ date: h.recordedAt.toISOString(), radScore: h.radScore })),
  };
  if (!owner) return summary;
  const wallet = await getWallet(p.userId);
  return {
    ...summary,
    walletBalance: wallet.balanceCents,
    walletEntries: wallet.entries.map((e) => ({ ...e, userId: p.userId })),
  };
}
