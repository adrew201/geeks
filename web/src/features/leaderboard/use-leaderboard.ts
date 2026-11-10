import { useCallback, useEffect, useMemo, useState } from "react";
import { getSession } from "../../lib/session.ts";
import type { LeaderboardEntry } from "../../types/api.ts";
import { fetchLeaderboard } from "./api.ts";

// The 10D state toolbar as real states:
//   A Default          → status "ready"
//   B Filtered         → `game` set (game is the only server filter; region has no endpoint)
//   C Search           → `search` set, filtered client-side over the loaded rows
//   D Unranked User    → `me` is null while signed in
//   E Loading          → status "loading" (skeletons)
//   F Empty Results    → status "ready" with no visible rows
//   G User Highlighted → the signed-in user's row is present and highlighted

interface Result {
  key: string;
  rows: LeaderboardEntry[];
  error: string | null;
}

export type LeaderboardStatus = "loading" | "error" | "ready";

export function useLeaderboard() {
  const [game, setGame] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [session] = useState(getSession);

  // A request is "loading" until a result for its exact key lands, so no state is set
  // synchronously inside the effect.
  const key = `${game ?? ""}|${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboard(game, controller.signal).then(
      (rows) => setResult({ key, rows: [...rows].sort((a, b) => a.rank - b.rank), error: null }),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key, rows: [], error: error instanceof Error ? error.message : "Something went wrong." });
      },
    );
    return () => controller.abort();
  }, [game, key]);

  const status: LeaderboardStatus =
    result?.key !== key ? "loading" : result.error ? "error" : "ready";
  const rows = useMemo(() => (status === "ready" && result ? result.rows : []), [status, result]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) => row.gamerTag.toLowerCase().includes(query) || row.gamerId.toLowerCase().includes(query),
    );
  }, [rows, search]);

  /** The signed-in user's row in the loaded results (README has no "my rank" endpoint). */
  const me = useMemo(
    () => (session ? (rows.find((row) => row.userId === session.userId) ?? null) : null),
    [rows, session],
  );

  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);
  const clearFilters = useCallback(() => {
    setGame(null);
    setSearch("");
  }, []);

  return {
    status,
    error: status === "error" ? (result?.error ?? null) : null,
    game,
    setGame,
    search,
    setSearch,
    rows,
    visibleRows,
    podium: rows.slice(0, 3),
    signedIn: session !== null,
    me,
    refresh,
    clearFilters,
  };
}

export type LeaderboardController = ReturnType<typeof useLeaderboard>;
