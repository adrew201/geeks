import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameSlug } from "../../config/games.ts";
import { ApiError } from "../../lib/api-client.ts";
import { getSession } from "../../lib/session.ts";
import type { LeaderboardMe, LeaderboardRow } from "../../types/api.ts";
import { DEFAULT_GAME, fetchLeaderboard } from "./api.ts";

// The 10D state toolbar as real states:
//   A Default          → status "ready"
//   B Filtered         → `game` set (game is the only server filter; region has no endpoint)
//   C Search           → `search` set, filtered client-side over the loaded rows
//   D Unranked User    → `me` is null (the API decides; coaches, sponsors, no clips in the game)
//   E Loading          → status "loading" (skeletons)
//   F Empty Results    → status "ready" with no visible rows
//   G User Highlighted → the row whose userId matches `me` is highlighted
// Plus: status "unknown-game" when the API rejects the slug with 400.

interface Result {
  key: string;
  rows: LeaderboardRow[];
  me: LeaderboardMe | null;
  error: string | null;
  errorStatus: number | null;
}

export type LeaderboardStatus = "loading" | "error" | "unknown-game" | "ready";

export function useLeaderboard() {
  const [game, setGame] = useState<GameSlug>(DEFAULT_GAME);
  const [search, setSearch] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [session] = useState(getSession);

  // A request is "loading" until a result for its exact key lands, so no state is set
  // synchronously inside the effect.
  const key = `${game}|${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboard(game, controller.signal).then(
      (response) =>
        setResult({
          key,
          rows: [...response.rows].sort((a, b) => a.rank - b.rank),
          me: response.me,
          error: null,
          errorStatus: null,
        }),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({
          key,
          rows: [],
          me: null,
          error: error instanceof Error ? error.message : "Something went wrong.",
          errorStatus: error instanceof ApiError ? error.status : null,
        });
      },
    );
    return () => controller.abort();
  }, [game, key]);

  const status: LeaderboardStatus =
    result?.key !== key
      ? "loading"
      : result.error
        ? result.errorStatus === 400
          ? "unknown-game"
          : "error"
        : "ready";
  const rows = useMemo(() => (status === "ready" && result ? result.rows : []), [status, result]);
  /** From the API (`me`), never looked up in `rows`: the user may rank outside them. */
  const me = status === "ready" && result ? result.me : null;

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) => row.gamerTag.toLowerCase().includes(query) || row.userId.toLowerCase().includes(query),
    );
  }, [rows, search]);

  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);
  const clearFilters = useCallback(() => {
    setGame(DEFAULT_GAME);
    setSearch("");
  }, []);

  return {
    status,
    error: status === "error" || status === "unknown-game" ? (result?.error ?? null) : null,
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
