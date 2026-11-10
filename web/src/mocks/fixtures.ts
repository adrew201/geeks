// Demo data for VITE_USE_MOCKS=true. Gamer tags come from the prototypes; clip URLs are
// placeholders (README §11: use only links we're allowed to use). Money in integer cents.

import {
  AI_SUMMARY_STATUS,
  BOUNTY_STATUS,
  BOUNTY_TYPE,
  CLIP_STATUS,
  PROFILE_VISIBILITY,
  ROLE,
  TIER,
  WALLET_ENTRY_KIND,
  type Bounty,
  type Clip,
  type GamerProfile,
  type HouseAd,
  type LeaderboardRow,
  type User,
  type WalletEntry,
} from "../types/api.ts";
import { GAMES, GAME_SLUGS, type GameSlug } from "../config/games.ts";

export const mockUser: User = {
  id: "usr_gamer_1",
  email: "gamer@play2pro.test",
  role: ROLE.GAMER,
  tier: TIER.FREE,
  isVerifiedAdult: true,
};

/**
 * Demo logins for mock mode. Any password works for these emails; other emails get 401.
 * Signing up with one of them returns the "email already registered" error.
 */
export const mockAccounts: User[] = [
  mockUser,
  {
    id: "usr_coach_1",
    email: "coach@play2pro.test",
    role: ROLE.COACH,
    tier: TIER.FREE,
    isVerifiedAdult: true,
  },
  {
    id: "usr_sponsor_1",
    email: "sponsor@play2pro.test",
    role: ROLE.SPONSOR,
    tier: TIER.FREE,
    isVerifiedAdult: true,
  },
];

export const mockGamers: GamerProfile[] = [
  {
    id: "gmr_shadowviper",
    userId: "usr_gamer_1",
    gamerTags: ["ShadowViper"],
    platforms: ["PC"],
    games: ["Valorant"],
    region: "Kenya",
    aiSummary: {
      summary:
        "Aggressive Valorant duelist with strong clutch play and consistent crosshair placement.",
      strengths: ["clutch", "aim"],
      roles: ["duelist"],
    },
    aiSummaryStatus: AI_SUMMARY_STATUS.ACCEPTED,
    radScore: 9420,
    visibility: PROFILE_VISIBILITY.PUBLIC,
  },
  {
    id: "gmr_phantomx",
    userId: "usr_gamer_2",
    gamerTags: ["PhantomX"],
    platforms: ["PC"],
    games: ["Valorant"],
    region: "Kenya",
    aiSummary: null,
    radScore: 9810,
    visibility: PROFILE_VISIBILITY.PUBLIC,
  },
  {
    id: "gmr_novastrike",
    userId: "usr_gamer_3",
    gamerTags: ["NovaStrike"],
    platforms: ["Mobile"],
    games: ["Call of Duty Mobile"],
    region: "Africa",
    aiSummary: null,
    radScore: 9105,
    visibility: PROFILE_VISIBILITY.PUBLIC,
  },
  {
    id: "gmr_ghostaim",
    userId: "usr_gamer_4",
    gamerTags: ["GhostAim"],
    platforms: ["Mobile"],
    games: ["Call of Duty Mobile"],
    region: "Kenya",
    aiSummary: null,
    radScore: 8720,
    visibility: PROFILE_VISIBILITY.PUBLIC,
  },
  {
    id: "gmr_vortex",
    userId: "usr_gamer_5",
    gamerTags: ["Vortex"],
    platforms: ["PC"],
    games: ["Fortnite"],
    region: "Ghana",
    aiSummary: null,
    radScore: 8540,
    visibility: PROFILE_VISIBILITY.PUBLIC,
  },
];

export const mockClips: Clip[] = [
  {
    id: "clp_1",
    ownerId: "gmr_shadowviper",
    url: "https://example.com/clips/clp_1",
    description: "1v3 clutch on Ascent with the Sheriff",
    game: "Valorant",
    tags: ["clutch", "1v3", "sheriff"],
    stats: { kills: 3, headshots: 2, objective: "spike defused" },
    keyMoments: [{ t: "0:07", label: "1v3 clutch" }],
    aiQualityScore: 78,
    eloRating: 1540,
    status: CLIP_STATUS.ANALYSED,
  },
  {
    id: "clp_2",
    ownerId: "gmr_phantomx",
    url: "https://example.com/clips/clp_2",
    description: "Ace on Bind B site retake",
    game: "Valorant",
    tags: ["ace", "retake"],
    stats: { kills: 5, headshots: 3 },
    aiQualityScore: 84,
    eloRating: 1610,
    status: CLIP_STATUS.ANALYSED,
  },
  {
    id: "clp_3",
    ownerId: "gmr_novastrike",
    url: "https://example.com/clips/clp_3",
    description: "Final circle squad wipe",
    game: "Call of Duty Mobile",
    tags: ["squad-wipe"],
    stats: null,
    aiQualityScore: null,
    eloRating: 1500,
    status: CLIP_STATUS.PENDING,
  },
  {
    id: "clp_4",
    ownerId: "gmr_ghostaim",
    url: "https://example.com/clips/clp_4",
    description: "Hardpoint hold with a 12-kill streak",
    game: "Call of Duty Mobile",
    tags: ["streak", "hardpoint"],
    stats: { kills: 12 },
    aiQualityScore: 71,
    eloRating: 1480,
    status: CLIP_STATUS.ANALYSED,
  },
  {
    id: "clp_5",
    ownerId: "gmr_vortex",
    url: "https://example.com/clips/clp_5",
    description: "Box fight edit sequence into a final-zone win",
    game: "Fortnite",
    tags: ["edit", "win"],
    stats: null,
    aiQualityScore: 66,
    eloRating: 1520,
    status: CLIP_STATUS.ANALYSED,
  },
];

export const mockHouseAd: HouseAd = {
  id: "ad_house_1",
  title: "Go ad-free with Play2Pro Paid",
  body: "Upgrade to remove ads and lower your donation fee.",
  ctaLabel: "Upgrade",
  ctaUrl: "/upgrade",
};

/** config/games.ts slug for a fixture's display-name game (null when the game has no slug yet). */
function gameSlugFor(name: string | undefined): GameSlug | null {
  return GAME_SLUGS.find((slug) => GAMES[slug].name === name) ?? null;
}

/**
 * Unranked leaderboard rows, one per gamer for their first game. Gamers whose game has no
 * confirmed slug (Vortex / Fortnite) are left out. The mock ranks them per game.
 */
export const mockLeaderboardRows: LeaderboardRow[] = mockGamers.flatMap((gamer) => {
  const game = gameSlugFor(gamer.games[0]);
  if (!game) return [];
  return [
    { rank: 0, userId: gamer.userId, gamerTag: gamer.gamerTags[0] ?? gamer.id, radScore: gamer.radScore, game },
  ];
});

export const mockBounties: Bounty[] = [
  {
    id: "bty_1",
    creatorId: "usr_sponsor_1",
    type: BOUNTY_TYPE.CHALLENGE,
    task: "Win a 1v3 clutch round in Valorant ranked",
    reward: 5000,
    deadline: "2026-11-11T18:00:00.000Z",
    status: BOUNTY_STATUS.OPEN,
  },
  {
    id: "bty_2",
    creatorId: "usr_sponsor_1",
    type: BOUNTY_TYPE.DARE,
    task: "Sheriff-only ace in a competitive match",
    reward: 2500,
    deadline: "2026-11-11T20:00:00.000Z",
    status: BOUNTY_STATUS.VERIFYING,
  },
];

export const mockWalletEntries: WalletEntry[] = [
  {
    id: "wal_1",
    userId: "usr_gamer_1",
    amount: 2000,
    kind: WALLET_ENTRY_KIND.DONATION,
    paypalRef: "CAP-001",
    createdAt: "2026-11-08T10:00:00.000Z",
  },
  {
    id: "wal_2",
    userId: "usr_gamer_1",
    amount: -100,
    kind: WALLET_ENTRY_KIND.FEE,
    paypalRef: "FEE-001",
    createdAt: "2026-11-08T10:00:01.000Z",
  },
  {
    id: "wal_3",
    userId: "usr_gamer_1",
    amount: 4500,
    kind: WALLET_ENTRY_KIND.BOUNTY,
    paypalRef: "CAP-002",
    createdAt: "2026-11-09T15:30:00.000Z",
  },
];
