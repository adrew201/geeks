import { useEffect, useState } from "react";
import type { CoachMatch } from "../../types/api.ts";
import type { RecommendationEntitlements } from "../plans/plans.ts";

// A coach's recommendation settings for the AI talent matches on /discover. Applied in the
// browser to GET /coach/matches; which settings a coach may change comes from their plan
// (plans.ts: Coach Pro unlocks all, a free coach only the game filter and 3 matches).
// Saved per browser as a convenience; locked settings are ignored, never just hidden.

export const SORT = { BEST: "best", HIDDEN_GEMS: "hidden-gems" } as const;
export type SortMode = (typeof SORT)[keyof typeof SORT];

export interface RecommendationSettings {
  game: string;
  region: string;
  minRadScore: number;
  sort: SortMode;
}

export const DEFAULT_SETTINGS: RecommendationSettings = { game: "", region: "", minRadScore: 0, sort: SORT.BEST };

const KEY = "play2pro.coach.recommendations";

function load(): RecommendationSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<RecommendationSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useRecommendationSettings() {
  const [settings, setSettings] = useState<RecommendationSettings>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable: settings last for this visit only */
    }
  }, [settings]);
  return [settings, setSettings] as const;
}

/** The matches to show: filters and sort the plan allows, capped at the plan's match count. */
export function applySettings(
  matches: CoachMatch[],
  settings: RecommendationSettings,
  allowed: RecommendationEntitlements,
): CoachMatch[] {
  const s = allowed.settings;
  const filtered = matches.filter(
    (m) =>
      (!s.game || !settings.game || m.game === settings.game) &&
      (!s.region || !settings.region || m.region === settings.region) &&
      (!s.minRadScore || m.radScore >= settings.minRadScore),
  );
  const sorted =
    s.sort && settings.sort === SORT.HIDDEN_GEMS
      ? [...filtered].sort((a, b) => a.radScore - b.radScore)
      : [...filtered].sort((a, b) => b.radScore - a.radScore);
  return sorted.slice(0, allowed.maxMatches);
}
