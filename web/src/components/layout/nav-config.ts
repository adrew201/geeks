// Decision 7: the single navigation config. Sidebars, bottom tabs, the public header
// and the footer all read from here.

import {
  Award,
  CloudUpload,
  Compass,
  Crosshair,
  Flame,
  LayoutDashboard,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ROLE, type Role } from "../../types/api.ts";

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  passport: "/passport",
  arena: "/arena",
  leaderboard: "/leaderboard",
  wallet: "/wallet",
  bounties: "/bounties",
  submitGameplay: "/clips/new",
  discover: "/discover",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export type NavAudience = "gamer" | "coach" | "sponsor";

// Icons follow the prototypes: layout-dashboard, award, flame (09M Arena), trophy,
// wallet, crosshair, upload-cloud, compass.
const DASHBOARD: NavItem = { label: "Dashboard", to: ROUTES.dashboard, icon: LayoutDashboard };
const PASSPORT: NavItem = { label: "Passport", to: ROUTES.passport, icon: Award };
const ARENA: NavItem = { label: "Arena", to: ROUTES.arena, icon: Flame };
const LEADERBOARD: NavItem = { label: "Leaderboard", to: ROUTES.leaderboard, icon: Trophy };
const WALLET: NavItem = { label: "Wallet", to: ROUTES.wallet, icon: Wallet };
const BOUNTIES: NavItem = { label: "Bounties", to: ROUTES.bounties, icon: Crosshair };
const SUBMIT: NavItem = { label: "Submit Gameplay", to: ROUTES.submitGameplay, icon: CloudUpload };
const DISCOVER: NavItem = { label: "Discover", to: ROUTES.discover, icon: Compass };

export const APP_NAV: Record<NavAudience, { sidebar: NavItem[]; tabs: NavItem[] }> = {
  gamer: {
    sidebar: [DASHBOARD, PASSPORT, ARENA, LEADERBOARD, WALLET, BOUNTIES, SUBMIT],
    tabs: [
      { ...DASHBOARD, label: "Home" },
      ARENA,
      { ...LEADERBOARD, label: "Ranks" },
      WALLET,
      PASSPORT,
    ],
  },
  coach: {
    sidebar: [DISCOVER],
    tabs: [DISCOVER],
  },
  sponsor: {
    sidebar: [DISCOVER, BOUNTIES],
    tabs: [DISCOVER, BOUNTIES],
  },
};

export function navAudienceFor(role: Role): NavAudience {
  if (role === ROLE.COACH) return "coach";
  if (role === ROLE.SPONSOR) return "sponsor";
  return "gamer";
}

/** Where each role lands after login. */
export function homeRouteFor(role: Role): string {
  return role === ROLE.GAMER ? ROUTES.dashboard : ROUTES.discover;
}

export interface PublicLink {
  label: string;
  to: string | { pathname: string; hash: string };
}

const section = (hash: string) => ({ pathname: ROUTES.home, hash });

/** 01D landing header links (hash sections on the landing page). */
export const PUBLIC_NAV: PublicLink[] = [
  { label: "How It Works", to: section("how-it-works") },
  { label: "For Gamers", to: section("for-gamers") },
  { label: "For Coaches", to: section("for-coaches") },
  { label: "For Sponsors", to: section("for-sponsors") },
  { label: "Skills Passport", to: section("passport") },
];

/** 01D footer columns, with unlock wording removed (decision 3). */
export const FOOTER_COLUMNS: Array<{ title: string; links: PublicLink[] }> = [
  {
    title: "Product",
    links: [
      { label: "How It Works", to: section("how-it-works") },
      { label: "Skills Passport", to: section("passport") },
      { label: "Leaderboard", to: ROUTES.leaderboard },
    ],
  },
  {
    title: "For Gamers",
    links: [
      { label: "Gamer Profile", to: ROUTES.passport },
      { label: "Submit Gameplay", to: ROUTES.submitGameplay },
      { label: "Wallet", to: ROUTES.wallet },
    ],
  },
  {
    title: "For Organizations",
    links: [
      { label: "For Coaches", to: section("for-coaches") },
      { label: "For Sponsors", to: section("for-sponsors") },
      { label: "Talent Discovery", to: ROUTES.discover },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: ROUTES.privacy },
      { label: "Terms of Service", to: ROUTES.terms },
    ],
  },
];
