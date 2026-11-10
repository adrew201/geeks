import { useCallback, useEffect, useState } from "react";
import { useSession } from "../../lib/session.ts";
import type { GamerDashboard } from "../../types/api.ts";
import { errorMessage, fetchGamerDashboard, isAbort, ownGamerId } from "../profile/api.ts";

// The signed-in gamer's own GET /api/v1/gamers/:id/dashboard (README §14: owner gets the
// stats plus wallet). Shared by /dashboard (page 05) and /wallet (page 08).
// Loads by userId, the same UNCONFIRMED assumption as /passport (see ownGamerId).
// Requests are keyed, so the state is "loading" until the result for the current key lands.

export type OwnDashboardStatus = "loading" | "ready" | "error";

interface Result {
  key: string;
  dashboard: GamerDashboard | null;
  error: string | null;
}

export function useOwnDashboard() {
  const session = useSession();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const gamerId = session ? ownGamerId(session) : null;
  const key = `${gamerId ?? ""}|${reloadCount}`;

  useEffect(() => {
    if (!gamerId) return;
    const controller = new AbortController();
    fetchGamerDashboard(gamerId, controller.signal).then(
      (dashboard) => setResult({ key, dashboard, error: null }),
      (error: unknown) => {
        if (isAbort(error)) return;
        setResult({ key, dashboard: null, error: errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [gamerId, key]);

  const current = result?.key === key ? result : null;
  // A reload (after a withdrawal) keeps showing the last good data instead of skeletons.
  const stale = !current && result?.dashboard ? result : null;
  const shown = current ?? stale;
  const status: OwnDashboardStatus = !shown ? "loading" : shown.dashboard ? "ready" : "error";

  return {
    status,
    dashboard: shown?.dashboard ?? null,
    error: shown?.error ?? null,
    refreshing: stale !== null,
    reload: useCallback(() => setReloadCount((count) => count + 1), []),
  };
}
