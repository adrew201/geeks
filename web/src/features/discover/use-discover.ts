import { useCallback, useEffect, useState } from "react";
import { useSession } from "../../lib/session.ts";
import { ROLE, type Bounty, type CoachMatch, type LeaderboardEntry } from "../../types/api.ts";
import { fetchBounties } from "../bounties/api.ts";
import { fetchLeaderboard } from "../leaderboard/api.ts";
import { errorMessage, isAbort } from "../profile/api.ts";
import { fetchCoachMatches } from "./api.ts";

// Data for /discover. Three independent loads, each with its own state, so one failing
// doesn't blank the page:
//   talent   GET /leaderboard (overall top 50): the browse grid and the counts, all roles
//   matches  GET /coach/matches: coaches only
//   bounties GET /bounties, filtered to the sponsor's own: sponsors only (summary card)

export type Load<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: string };

function useLoad<T>(enabled: boolean, load: (signal: AbortSignal) => Promise<T>) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{ key: number; value: Load<T> } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => setResult({ key: reloadCount, value: { status: "ready", data } }),
      (error: unknown) => {
        if (isAbort(error)) return;
        setResult({ key: reloadCount, value: { status: "error", error: errorMessage(error) } });
      },
    );
    return () => controller.abort();
    // `load` is a module-level function per call site; reload is driven by reloadCount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadCount]);

  const value: Load<T> = result?.key === reloadCount ? result.value : { status: "loading" };
  return { value, reload: useCallback(() => setReloadCount((count) => count + 1), []) };
}

const loadTalent = (signal: AbortSignal) => fetchLeaderboard(null, signal).then((response) => response.entries);

export function useDiscover() {
  const session = useSession();
  const isCoach = session?.role === ROLE.COACH;
  const isSponsor = session?.role === ROLE.SPONSOR;
  const userId = session?.userId ?? null;

  const talent = useLoad<LeaderboardEntry[]>(true, loadTalent);
  const matches = useLoad<CoachMatch[]>(isCoach, fetchCoachMatches);
  const bounties = useLoad<Bounty[]>(isSponsor, (signal) =>
    fetchBounties(signal).then((list) => list.filter((bounty) => bounty.creatorId === userId)),
  );

  return { isCoach, isSponsor, talent, matches, bounties };
}
