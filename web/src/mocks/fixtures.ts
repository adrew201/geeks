// Demo data for VITE_USE_MOCKS=true. Gamer tags come from the prototypes; clip URLs are
// placeholders (README §11: use only links we're allowed to use). Money in integer cents.

import {
  AI_SUMMARY_STATUS,
  BOUNTY_STATUS,
  BOUNTY_TYPE,
  CLIP_STATUS,
  PROFILE_VISIBILITY,
  ROLE,
  SUBMISSION_STATUS,
  TIER,
  WALLET_ENTRY_KIND,
  type ApiBounty,
  type CoachMatch,
  type Clip,
  type GamerProfile,
  type HouseAd,
  type LeaderboardEntry,
  type User,
  type WalletEntry,
} from "../types/api.ts";

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
    platforms: ["Mobile"],
    games: ["Call of Duty Mobile"],
    region: "Ghana",
    aiSummary: null,
    radScore: 8540,
    visibility: PROFILE_VISIBILITY.PUBLIC,
    // Not a verified adult: can't receive donations (README §18). Disables the donate button.
    isVerifiedAdult: false,
  },
];

export const mockClips: Clip[] = [
  {
    id: "clp_1",
    ownerId: "gmr_shadowviper",
    url: "https://example.com/clips/clp_1",
    title: "1v3 clutch on Ascent with the Sheriff",
    description: "1v3 clutch on Ascent with the Sheriff",
    game: "Valorant",
    tags: ["clutch", "1v3", "sheriff"],
    stats: { kills: 3, headshots: 2, objective: "spike defused" },
    keyMoments: [{ t: "0:07", label: "1v3 clutch" }],
    aiQualityScore: 78,
    eloRating: 1540,
    status: CLIP_STATUS.COMPLETED,
  },
  // Two more ShadowViper clips for the /dashboard pipeline (the feed hides your own clips).
  {
    id: "clp_6",
    ownerId: "gmr_shadowviper",
    url: "https://example.com/clips/clp_6",
    title: "Operator ace on Icebox A site hold",
    description: "Operator ace on Icebox A site hold",
    game: "Valorant",
    tags: ["ace", "operator", "hold"],
    stats: { kills: 5, headshots: 4 },
    aiQualityScore: 88,
    eloRating: 1585,
    status: CLIP_STATUS.COMPLETED,
  },
  {
    id: "clp_7",
    ownerId: "gmr_shadowviper",
    url: "https://example.com/clips/clp_7",
    title: "Ranked match highlight: 4k retake on Lotus",
    description: "Ranked match highlight: 4k retake on Lotus",
    game: "Valorant",
    tags: [],
    stats: null,
    aiQualityScore: null,
    eloRating: 1500,
    status: CLIP_STATUS.PROCESSING,
  },
  {
    id: "clp_2",
    ownerId: "gmr_phantomx",
    url: "https://example.com/clips/clp_2",
    title: "Ace on Bind B site retake",
    description: "Ace on Bind B site retake",
    game: "Valorant",
    tags: ["ace", "retake"],
    stats: { kills: 5, headshots: 3 },
    aiQualityScore: 84,
    eloRating: 1610,
    status: CLIP_STATUS.COMPLETED,
  },
  {
    id: "clp_3",
    ownerId: "gmr_novastrike",
    url: "https://example.com/clips/clp_3",
    title: "Search and Destroy 1v4",
    description: "Search and Destroy 1v4",
    game: "Call of Duty Mobile",
    tags: ["clutch", "search-and-destroy"],
    stats: null,
    aiQualityScore: null,
    eloRating: 1500,
    status: CLIP_STATUS.PENDING,
  },
  {
    id: "clp_4",
    ownerId: "gmr_ghostaim",
    url: "https://example.com/clips/clp_4",
    title: "Hardpoint hold on Firing Range",
    description: "Hardpoint hold on Firing Range",
    game: "Call of Duty Mobile",
    tags: ["streak", "hardpoint"],
    stats: { kills: 12 },
    aiQualityScore: 71,
    eloRating: 1480,
    status: CLIP_STATUS.COMPLETED,
  },
  {
    id: "clp_5",
    ownerId: "gmr_vortex",
    url: "https://example.com/clips/clp_5",
    title: "Quickscope streak",
    description: "Quickscope streak",
    game: "Call of Duty Mobile",
    tags: ["quickscope", "streak"],
    stats: null,
    aiQualityScore: 66,
    eloRating: 1520,
    status: CLIP_STATUS.COMPLETED,
  },
];

export const mockHouseAd: HouseAd = {
  id: "ad_house_1",
  title: "Go ad-free with Play2Pro Paid",
  body: "Upgrade to remove ads and lower your donation fee.",
  ctaLabel: "Upgrade",
  ctaUrl: "/upgrade", // ROUTES.upgrade
};

/** Display names for the leaderboard fixtures (the API's `displayName` comes from User). */
const DISPLAY_NAMES: Record<string, string> = {
  usr_gamer_1: "Brian Otieno",
  usr_gamer_2: "Kevin Mwangi",
  usr_gamer_3: "Amina Hassan",
  usr_gamer_4: "Daniel Kiprop",
  usr_gamer_5: "Kwame Mensah",
};

/**
 * Unranked leaderboard entries plus the games each gamer is listed under (primary first, as
 * GamerProfile.primaryGame / secondaryGames). The mock filters, sorts and ranks them.
 * PhantomX has no avatar or region, to exercise the nulls.
 */
export const mockLeaderboardEntries: Array<{ entry: LeaderboardEntry; games: string[] }> = mockGamers.map(
  (gamer, index) => ({
    games: gamer.games,
    entry: {
      rank: 0,
      gamerId: gamer.userId,
      gamerTag: gamer.gamerTags[0] ?? gamer.id,
      displayName: DISPLAY_NAMES[gamer.userId] ?? gamer.gamerTags[0] ?? gamer.id,
      avatarUrl: null,
      primaryGame: gamer.games[0] ?? "Valorant",
      region: gamer.id === "gmr_phantomx" ? null : gamer.region,
      radScore: gamer.radScore,
      currentElo: 1500 - index * 25,
    },
  }),
);

/**
 * Bounties in both API shapes on purpose, so features/bounties/bounty-status.ts is exercised:
 * bty_1 uses README names (task, reward in cents, OPEN); bty_2 uses Prisma names (title,
 * taskDescription, rewardAmount in dollars, OPEN_ESCROWED) and has two entries, one with a README
 * aiVerdict and one with the schema's score and JSON notes. Both belong to sponsor@play2pro.test.
 * Deadlines are relative so the demo never shows them as past.
 */
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

export const mockBounties: ApiBounty[] = [
  {
    id: "bty_1",
    creatorId: "usr_sponsor_1",
    type: BOUNTY_TYPE.CHALLENGE,
    task: "Win a 1v3 clutch round in Valorant ranked",
    game: "valorant",
    reward: 5000,
    deadline: hoursFromNow(20),
    status: BOUNTY_STATUS.OPEN,
    submissions: [],
  },
  {
    id: "bty_2",
    creatorId: "usr_sponsor_1",
    bountyType: BOUNTY_TYPE.DARE,
    title: "Sheriff-only ace",
    taskDescription: "Get an ace using only the Sheriff in a competitive match. Show the full round.",
    game: "valorant",
    rewardAmount: "25.00",
    deadline: hoursFromNow(30),
    status: "OPEN_ESCROWED",
    submissions: [
      {
        id: "sub_1",
        gamerId: "usr_gamer_2",
        gamerTag: "PhantomX",
        clipUrl: "https://www.youtube.com/watch?v=play2pro-demo-1",
        note: "Round 9, ace on A site.",
        aiVerdict: {
          pass: true,
          confidence: 0.86,
          matchesGame: true,
          taskCompleted: true,
          looksReused: false,
          reason: "Clip shows five Sheriff kills in one Valorant round.",
        },
        confirmed: false,
      },
      {
        id: "sub_2",
        gamerId: "usr_gamer_3",
        gamerTag: "NovaStrike",
        clipUrl: "https://www.twitch.tv/videos/play2pro-demo-2",
        status: SUBMISSION_STATUS.AI_REJECTED,
        aiVerificationStatus: "COMPLETED",
        aiConfidenceScore: 0.71,
        // As the worker writes it: the whole verdict as JSON (toSubmission parses it).
        aiReviewNotes: JSON.stringify({
          pass: false,
          confidence: 0.71,
          matchesGame: true,
          taskCompleted: false,
          looksReused: false,
          reason: "Two of the five kills use the Vandal.",
        }),
      },
    ],
  },
];

/**
 * ShadowViper's ledger across ~4 months, covering every kind (decision 3): donations with their
 * fee, bounty rewards, ad share, a paid withdrawal, and a failed payout reversed (README §13).
 * Balance = sum = $142.30. Dates are relative to now so the 30-day filter always has rows.
 */
const daysAgo = (days: number, hour = 12) => {
  const date = new Date(Date.now() - days * 86_400_000);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

type LedgerRow = [days: number, amount: number, kind: WalletEntry["kind"], ref: string];

const SHADOWVIPER_LEDGER: LedgerRow[] = [
  [118, 1500, WALLET_ENTRY_KIND.DONATION, "CAP-1001"],
  [118, -75, WALLET_ENTRY_KIND.FEE, "FEE-1001"],
  [104, 320, WALLET_ENTRY_KIND.AD_SHARE, "ADS-2026-07"],
  [96, 2500, WALLET_ENTRY_KIND.BOUNTY, "CAP-1002"],
  [81, 1000, WALLET_ENTRY_KIND.DONATION, "CAP-1003"],
  [81, -50, WALLET_ENTRY_KIND.FEE, "FEE-1003"],
  [74, 410, WALLET_ENTRY_KIND.AD_SHARE, "ADS-2026-08"],
  [70, -3000, WALLET_ENTRY_KIND.WITHDRAWAL, "PO-5001"],
  [55, 3500, WALLET_ENTRY_KIND.DONATION, "CAP-1004"],
  [55, -175, WALLET_ENTRY_KIND.FEE, "FEE-1004"],
  [44, 380, WALLET_ENTRY_KIND.AD_SHARE, "ADS-2026-09"],
  [38, -2000, WALLET_ENTRY_KIND.WITHDRAWAL, "PO-5002"],
  [37, 2000, WALLET_ENTRY_KIND.REVERSAL, "PO-5002-R"],
  [26, 5000, WALLET_ENTRY_KIND.BOUNTY, "CAP-1005"],
  [14, 520, WALLET_ENTRY_KIND.AD_SHARE, "ADS-2026-10"],
  [9, -4000, WALLET_ENTRY_KIND.WITHDRAWAL, "PO-5003"],
  [2, 2000, WALLET_ENTRY_KIND.DONATION, "CAP-1006"],
  [2, -100, WALLET_ENTRY_KIND.FEE, "FEE-1006"],
  [1, 4500, WALLET_ENTRY_KIND.BOUNTY, "CAP-1007"],
];

export const mockWalletEntries: WalletEntry[] = SHADOWVIPER_LEDGER.map(([days, amount, kind, ref], index) => ({
  id: `wal_${index + 1}`,
  userId: "usr_gamer_1",
  amount,
  kind,
  paypalRef: ref,
  // Fees land a second after the capture they belong to.
  createdAt: daysAgo(days, kind === WALLET_ENTRY_KIND.FEE ? 13 : 12),
}));

/**
 * Weekly rad score points ending today, shaped so the chart shows a climb with one dip.
 * The last point equals the gamer's current radScore.
 */
const RAD_SCORE_STEPS = [-1180, -1010, -920, -960, -700, -540, -410, -300, -120, 0];

export function mockRadScoreHistory(radScore: number): Array<{ date: string; radScore: number }> {
  return RAD_SCORE_STEPS.map((step, index) => ({
    date: daysAgo((RAD_SCORE_STEPS.length - 1 - index) * 7, 0),
    radScore: Math.max(0, radScore + step),
  }));
}

/** GET /coach/matches demo answer for coach@play2pro.test. gamerId = userId, like the leaderboard. */
export const mockCoachMatches: CoachMatch[] = [
  {
    gamerId: "usr_gamer_1",
    gamerTag: "ShadowViper",
    game: "Valorant",
    region: "Kenya",
    radScore: 9420,
    reason: "Consistent 1vX clutches and crosshair placement; fits a duelist slot on a Valorant roster.",
  },
  {
    gamerId: "usr_gamer_4",
    gamerTag: "GhostAim",
    game: "Call of Duty Mobile",
    region: "Kenya",
    radScore: 8720,
    reason: "Long hardpoint streaks with steady objective time; strong anchor for a CODM team.",
  },
  {
    gamerId: "usr_gamer_5",
    gamerTag: "Vortex",
    game: "Call of Duty Mobile",
    region: "Ghana",
    radScore: 8540,
    reason: "Sharp quickscopes and fast rotations in Search and Destroy; rising quickly this month.",
  },
];
