import { prisma } from "../prisma.js";

const LEADERBOARD_SIZE = 50;

// Gamers ranked by rad score. `game` narrows who appears; it doesn't change scores.
export async function getLeaderboard(game?: string) {
  const profiles = await prisma.gamerProfile.findMany({
    where: {
      visibility: true,
      ...(game ? { OR: [{ primaryGame: game }, { secondaryGames: { has: game } }] } : {}),
    },
    orderBy: [{ radScore: "desc" }, { currentElo: "desc" }],
    take: LEADERBOARD_SIZE,
    select: {
      userId: true,
      gamerTag: true,
      primaryGame: true,
      radScore: true,
      currentElo: true,
      user: { select: { displayName: true, avatarUrl: true, region: true } },
    },
  });

  return {
    game: game || null,
    entries: profiles.map((p, i) => ({
      rank: i + 1,
      gamerId: p.userId,
      gamerTag: p.gamerTag,
      displayName: p.user.displayName,
      avatarUrl: p.user.avatarUrl,
      primaryGame: p.primaryGame,
      region: p.user.region,
      radScore: p.radScore,
      currentElo: p.currentElo,
    })),
  };
}
