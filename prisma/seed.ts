// Fabiola: 14 gamers (7 Valorant, 7 Call of Duty Mobile), 2 coaches, 1 sponsor, 40 clips with votes.
// Rerunnable: deletes only @seed.play2pro.test users, then recreates them. Same data every run.
import "dotenv/config";
import type { Role, Tier } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/plugins/auth/password.js";
import { recordVote, recomputeRadScore } from "../src/lib/ranking/index.js";
import { getLeaderboard } from "../src/lib/ranking/leaderboard.js";

const SEED_DOMAIN = "seed.play2pro.test";

// Rabasa's clip links, keyed by game. Each game's gamers take its URLs in order.
const CLIP_URLS: Record<string, string[]> = {
  Valorant: [
    "https://www.youtube.com/watch?v=1fbml1rGXk0",
    "https://www.youtube.com/watch?v=K7G0HGNt910",
    "https://www.youtube.com/watch?v=wZ3AQXB8Vj4",
    "https://www.youtube.com/watch?v=xzrDyGdzBb0",
    "https://www.youtube.com/watch?v=XdVq2N79HVc",
    "https://www.youtube.com/watch?v=CIUJdaLjSCI",
    "https://www.youtube.com/watch?v=psftTShgBiQ",
    "https://www.youtube.com/watch?v=lihYUxBZ_BE",
    "https://www.youtube.com/watch?v=QtnBCECeL6E",
    "https://www.youtube.com/watch?v=MS-WoI7l2ZE",
    "https://www.youtube.com/watch?v=rQPZC93T8lQ",
    "https://www.youtube.com/watch?v=1ipFDyilXOc",
    "https://www.youtube.com/watch?v=BcmWO2hTsSI",
    "https://www.youtube.com/watch?v=QnBTE-UVpX4",
    "https://www.youtube.com/watch?v=iY8H8ZXbPWk",
    "https://www.youtube.com/watch?v=AdVJNTpOFIY",
    "https://www.youtube.com/watch?v=DKES_1v3uxY",
    "https://www.youtube.com/watch?v=H2eWoRSiGU0",
    "https://www.youtube.com/watch?v=39gKayF81PI",
    "https://www.youtube.com/watch?v=i3ayYsJAhH4",
  ],
  "Call of Duty Mobile": [
    "https://www.youtube.com/watch?v=hr2sBxg0sq0",
    "https://www.youtube.com/watch?v=5lBYbI1MDbw",
    "https://www.youtube.com/watch?v=BC91XkS8xQU",
    "https://www.youtube.com/watch?v=KcIoSA1vW-4",
    "https://www.youtube.com/watch?v=uE_gH1K09JY",
    "https://www.youtube.com/watch?v=EfYWUdiLUDg",
    "https://www.youtube.com/watch?v=njt76vltyf8",
    "https://www.youtube.com/watch?v=VbiajUdT2mg",
    "https://www.youtube.com/watch?v=u0w0zJFxLms",
    "https://www.youtube.com/watch?v=olMha2xih-0",
    "https://www.youtube.com/watch?v=PM9lcrpCTbA",
    "https://www.youtube.com/watch?v=v13awm-rY7g",
    "https://www.youtube.com/watch?v=hKHJtbLCWVc",
    "https://www.youtube.com/watch?v=dKUrtTVi5ts",
    "https://www.youtube.com/watch?v=8kqObv3-n_w",
    "https://www.youtube.com/watch?v=v6z36fJK768",
    "https://www.youtube.com/watch?v=EaahgoPu7Js",
    "https://www.youtube.com/watch?v=QzWuRS3IxjQ",
    "https://www.youtube.com/watch?v=_wrYG9Di9_M",
    "https://www.youtube.com/watch?v=ZSUGkV9M8ug",
  ],
};

// Game names must match the web app's display names (web/src/config/games.ts).
const GAMERS: { tag: string; game: string; tier: Tier; adult: boolean; region: string }[] = [
  { tag: "ShadowStep", game: "Valorant", tier: "PAID", adult: true, region: "KE" },
  { tag: "KopaClutch", game: "Valorant", tier: "FREE", adult: true, region: "NG" },
  { tag: "NairobiNova", game: "Valorant", tier: "PAID", adult: true, region: "KE" },
  { tag: "Vandalina", game: "Valorant", tier: "FREE", adult: true, region: "GLOBAL" },
  { tag: "SpikeSensei", game: "Valorant", tier: "FREE", adult: true, region: "NG" },
  { tag: "EcoRound", game: "Valorant", tier: "FREE", adult: false, region: "KE" },
  { tag: "OperatorOdi", game: "Valorant", tier: "FREE", adult: true, region: "GLOBAL" },
  { tag: "Hardpoint254", game: "Call of Duty Mobile", tier: "PAID", adult: true, region: "KE" },
  { tag: "LagosLoadout", game: "Call of Duty Mobile", tier: "FREE", adult: true, region: "NG" },
  { tag: "QuickscopeQueen", game: "Call of Duty Mobile", tier: "PAID", adult: true, region: "GLOBAL" },
  { tag: "NuketownNjeri", game: "Call of Duty Mobile", tier: "FREE", adult: true, region: "KE" },
  { tag: "ScorestreakSeyi", game: "Call of Duty Mobile", tier: "FREE", adult: true, region: "NG" },
  { tag: "SlideCancel", game: "Call of Duty Mobile", tier: "FREE", adult: false, region: "GLOBAL" },
  { tag: "GulagGhost", game: "Call of Duty Mobile", tier: "FREE", adult: true, region: "KE" },
];

const STAFF: { name: string; email: string; role: Role; tier: Tier }[] = [
  { name: "Coach Amani", email: "coach.amani", role: "COACH", tier: "PAID" },
  { name: "Coach Tolu", email: "coach.tolu", role: "COACH", tier: "PAID" },
  { name: "Demo Sponsor", email: "sponsor", role: "SPONSOR", tier: "FREE" },
];

const CLIP_TITLES: Record<string, string[]> = {
  Valorant: ["1v3 clutch on Ascent", "Sheriff ace on Bind", "Retake with 10 HP"],
  "Call of Duty Mobile": ["Hardpoint hold on Firing Range", "Search and Destroy 1v4", "Quickscope streak"],
};

// mulberry32: small seeded PRNG so every run produces the same votes and views.
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = prng(20261111);

const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) {
  throw new Error("Set SEED_PASSWORD in .env (at least 8 characters, same rule as signup).");
}

try {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${SEED_DOMAIN}` } } });
} catch (e) {
  if ((e as { code?: string }).code === "P2003") {
    throw new Error(
      "Seed users have wallet entries (ledger rows are never deleted). Reseed on a fresh database instead.",
      { cause: e },
    );
  }
  throw e;
}

const accounts: { email: string; role: Role; tier: Tier; verifiedAdult: boolean }[] = [];

const gamers = [];
for (const g of GAMERS) {
  const email = `${g.tag.toLowerCase()}@${SEED_DOMAIN}`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      displayName: g.tag,
      role: "GAMER",
      tier: g.tier,
      isVerifiedAdult: g.adult,
      region: g.region,
      profile: { create: { gamerTag: g.tag, primaryGame: g.game } },
    },
  });
  gamers.push({ ...g, id: user.id, skill: 0.3 + rand() * 0.6 });
  accounts.push({ email, role: "GAMER", tier: g.tier, verifiedAdult: g.adult });
}

const staff = [];
for (const s of STAFF) {
  const email = `${s.email}@${SEED_DOMAIN}`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      displayName: s.name,
      role: s.role,
      tier: s.tier,
      isVerifiedAdult: true,
    },
  });
  staff.push({ ...s, id: user.id });
  accounts.push({ email, role: s.role, tier: s.tier, verifiedAdult: true });
}

// Gamers take up to 3 of their game's URLs in order: 6 get 3 clips and the last of each game gets 2, 40 clips.
// Each clip's upvote odds sit near its owner's skill.
const clips = [];
const urlIndex: Record<string, number> = {};
for (const g of gamers) {
  const urls = CLIP_URLS[g.game];
  urlIndex[g.game] ??= 0;
  for (let c = 0; c < 3 && urlIndex[g.game] < urls.length; c++) {
    const clip = await prisma.clip.create({
      data: {
        gamerId: g.id,
        title: CLIP_TITLES[g.game][c],
        description: CLIP_TITLES[g.game][c],
        videoUrl: urls[urlIndex[g.game]++],
        game: g.game,
        viewCount: 50 + Math.floor(rand() * 850),
      },
    });
    clips.push({ id: clip.id, ownerId: g.id, upvoteOdds: Math.min(Math.max(g.skill + (rand() - 0.5) * 0.2, 0.05), 0.95) });
  }
}

// 6-12 votes per clip from other seed users, one at a time so Elo updates don't overlap.
const voterIds = [...gamers.map((g) => g.id), ...staff.map((s) => s.id)];
let voteCount = 0;
for (const clip of clips) {
  const voters = voterIds
    .filter((id) => id !== clip.ownerId)
    .map((id) => ({ id, order: rand() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 6 + Math.floor(rand() * 7));
  for (const voter of voters) {
    await recordVote(clip.id, voter.id, rand() < clip.upvoteOdds ? "UPVOTE" : "DOWNVOTE");
    voteCount++;
  }
}

// Each coach endorses 2 of the top 4 gamers by rad score.
const top = await prisma.gamerProfile.findMany({
  where: { userId: { in: gamers.map((g) => g.id) } },
  orderBy: { radScore: "desc" },
  take: 4,
  select: { userId: true },
});
const coaches = staff.filter((s) => s.role === "COACH");
for (const [i, profile] of top.entries()) {
  await prisma.coachEndorsement.create({
    data: {
      coachId: coaches[i % 2].id,
      gamerId: profile.userId,
      comment: "Consistent mechanics and smart decision-making under pressure.",
    },
  });
  await recomputeRadScore(profile.userId, "Coach Endorsement");
}

console.log(`Seeded ${gamers.length} gamers, ${staff.length} staff, ${clips.length} clips, ${voteCount} votes, ${top.length} endorsements.`);
console.log("Accounts (password: SEED_PASSWORD from .env):");
console.table(accounts);
console.log("Top 5 on the leaderboard:");
console.table((await getLeaderboard()).entries.slice(0, 5).map(({ rank, gamerTag, primaryGame, radScore }) => ({ rank, gamerTag, primaryGame, radScore })));

await prisma.$disconnect();
