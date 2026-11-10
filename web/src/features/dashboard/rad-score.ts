import type { GamerDashboard } from "../../types/api.ts";

/** Change from the first to the last history point, or null with fewer than two points. */
export function radScoreChange(history: GamerDashboard["radScoreHistory"]): number | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return sorted.at(-1)!.radScore - sorted[0]!.radScore;
}
