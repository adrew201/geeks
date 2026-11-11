// Pure rules for the Gamer profile page: who is looking, what they may see, and what the
// data supports. No React here, so the rules can be read (and later tested) in one place.

import { RAD_SCORE_LABEL, type TrustLevel } from "../../config/labels.ts";
import type { Session } from "../../lib/session.ts";
import {
  AI_SUMMARY_STATUS,
  CLIP_STATUS,
  ROLE,
  type AiSkillSummary,
  type Clip,
  type GamerDashboard,
  type GamerProfile,
} from "../../types/api.ts";

/* ------------------------------ viewer ------------------------------ */

export type ViewerKind = "owner" | "coach" | "sponsor" | "gamer" | "public";

/** Ownership comes from GamerProfile.userId vs the JWT userId (README §13, §18). */
export function viewerKindFor(session: Session | null, profile: GamerProfile): ViewerKind {
  if (!session) return "public";
  if (session.userId === profile.userId) return "owner";
  if (session.role === ROLE.COACH) return "coach";
  if (session.role === ROLE.SPONSOR) return "sponsor";
  return "gamer";
}

export interface ViewerAccess {
  /** May call GET /gamers/:id/dashboard (README §14 guard). */
  dashboard: boolean;
  /** Sees evidence clips. Sponsors get "summary stats only", so no clip list. */
  clips: boolean;
  /** Owner tools from 06D: visibility toggle, AI summary review, share. */
  manage: boolean;
}

/**
 * README §18 "Who sees what":
 *   Public / free users  Gamer ID yes, dashboard no
 *   Coaches              Gamer ID yes, dashboard read-only
 *   Sponsors             Gamer ID yes, summary stats only
 *   The gamer            Gamer ID yes, dashboard plus wallet
 * Another signed-in gamer is in the first row: the dashboard guard has no GAMER entry.
 * The API enforces this too; the UI only avoids asking for what it would refuse.
 */
export const VIEWER_ACCESS: Record<ViewerKind, ViewerAccess> = {
  owner: { dashboard: true, clips: true, manage: true },
  coach: { dashboard: true, clips: true, manage: false },
  sponsor: { dashboard: true, clips: false, manage: false },
  gamer: { dashboard: false, clips: false, manage: false },
  public: { dashboard: false, clips: false, manage: false },
};

/* ------------------------------ identity ------------------------------ */

export function displayName(profile: GamerProfile): string {
  return profile.gamerTags[0] ?? profile.id;
}

/** Parts of the passport the gamer still has to fill in (12D state B "Incomplete Passport"). */
export function missingPassportFields(profile: GamerProfile): string[] {
  const missing: string[] = [];
  if (profile.gamerTags.length === 0) missing.push("gamer tag");
  if (profile.games.length === 0) missing.push("game");
  if (profile.platforms.length === 0) missing.push("platform");
  if (!profile.region) missing.push("region");
  return missing;
}

/** "game, platform and region" */
export function joinList(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");
}

/** "Valorant • Kenya • PC" (12M identity line). */
export function identityLine(profile: GamerProfile): string {
  return [profile.games[0], profile.region, profile.platforms[0]].filter(Boolean).join(" • ");
}

/* ------------------------------ AI summary ------------------------------ */

export function isSummaryPending(profile: GamerProfile): boolean {
  return profile.aiSummary !== null && profile.aiSummaryStatus === AI_SUMMARY_STATUS.PENDING_REVIEW;
}

/**
 * The summary this viewer should see. A summary awaiting the owner's review is the owner's
 * alone; everyone else sees "not yet assessed" until it's accepted.
 */
export function visibleSummary(profile: GamerProfile, kind: ViewerKind): AiSkillSummary | null {
  if (!profile.aiSummary) return null;
  if (kind !== "owner" && isSummaryPending(profile)) return null;
  return profile.aiSummary;
}

/* ------------------------------ clips ------------------------------ */

/** A clip is AI-assessed once its analysis has completed. */
export function isClipAnalysed(clip: Clip): boolean {
  return clip.status === CLIP_STATUS.COMPLETED && clip.aiQualityScore !== null;
}

function parseHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed : null;
  } catch {
    return null;
  }
}

/** The clip link if it's http(s), else null, so API data can never become a javascript: link. */
export function safeClipUrl(url: string): string | null {
  return parseHttpUrl(url)?.href ?? null;
}

/** "YouTube" / "Twitch" / host name, from the clip link (06D "Source: YouTube Link"). */
export function clipSource(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "YouTube";
  if (host.endsWith("twitch.tv")) return "Twitch";
  return host;
}

/* ------------------------------ trust ------------------------------ */

/**
 * Trust badges the data supports (docs/ui-audit.md §10: display only, derived where possible).
 * - self-reported: identity fields the gamer typed in (tags, games, platforms, region).
 * - community:     rad score above zero, since it's built from community votes (README §16.2).
 * - ai:            an AI summary this viewer can see, or an analysed clip.
 * - verified:      never. No contract field confirms an achievement or identity.
 */
export function profileTrust(profile: GamerProfile): { selfReported: boolean; community: boolean } {
  return {
    selfReported:
      profile.gamerTags.length > 0 ||
      profile.games.length > 0 ||
      profile.platforms.length > 0 ||
      profile.region !== null,
    community: profile.radScore > 0,
  };
}

/** The trust levels shown anywhere on the page, so the legend explains only those. */
export function trustLevelsOnPage(
  profile: GamerProfile,
  summary: AiSkillSummary | null,
  clips: Clip[] | null,
): TrustLevel[] {
  const { selfReported, community } = profileTrust(profile);
  const levels: TrustLevel[] = [];
  if (selfReported) levels.push("self-reported");
  if (community) levels.push("community");
  if (summary || clips?.some(isClipAnalysed)) levels.push("ai");
  return levels;
}

/** 12D trust bar descriptions, verbatim. */
export const TRUST_DESCRIPTIONS: Record<TrustLevel, string> = {
  "self-reported": "Gamer-supplied unverified claims.",
  community: "Audience voting and consensus signals.",
  ai: "Automated gameplay evidence analysis.",
  verified: "Independently confirmed achievement.",
};

/* ------------------------------ metrics ------------------------------ */

const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export interface Metric {
  key: "rad-score" | "rad-change" | "clips" | "ai-clips";
  label: string;
  /** Mobile label (12M uses shorter ones). */
  shortLabel: string;
  value: string;
  hint: string;
}

/**
 * The 12D metric cards that have contract data. "Community Votes" and "Profile Views" have
 * no field and are not shown; rad-score change and AI-assessed clips replace them, both
 * derived from GET /gamers/:id/dashboard.
 */
export function buildMetrics(profile: GamerProfile, dashboard: GamerDashboard | null): Metric[] {
  const metrics: Metric[] = [
    {
      key: "rad-score",
      label: RAD_SCORE_LABEL,
      shortLabel: RAD_SCORE_LABEL,
      value: formatNumber(profile.radScore),
      hint: "Votes, bounties and tournaments",
    },
  ];

  const history = dashboard?.radScoreHistory ?? [];
  const first = history[0];
  const last = history.at(-1);
  if (first && last && history.length > 1) {
    const change = last.radScore - first.radScore;
    metrics.push({
      key: "rad-change",
      label: `${RAD_SCORE_LABEL} change`,
      shortLabel: "Change",
      value: `${change > 0 ? "+" : ""}${formatNumber(change)}`,
      hint: `Since ${dateFormat.format(new Date(first.date))}`,
    });
  }

  const clips = dashboard?.clips;
  if (clips) {
    metrics.push({
      key: "clips",
      label: "Submitted clips",
      shortLabel: "Clips",
      value: formatNumber(clips.length),
      hint: "Gameplay evidence clips",
    });
    metrics.push({
      key: "ai-clips",
      label: "AI-assessed clips",
      shortLabel: "AI-assessed",
      value: formatNumber(clips.filter(isClipAnalysed).length),
      hint: "Analysed by the clip AI",
    });
  }
  return metrics;
}
