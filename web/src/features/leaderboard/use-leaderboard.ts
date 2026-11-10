import { useCallback, useEffect, useMemo, useState } from "react";
import { getSession } from "../../lib/session.ts";
import { ROLE, type LeaderboardEntry } from "../../types/api.ts";
import { DEFAULT_GAME, fetchLeaderboard, type GameFilter } from "./api.ts";

// The 10D state toolbar as real states:
//   A Default          → status "ready", overall board (no `game`)
//   B Filtered         → `game` set (game is the only server filter; region has no endpoint)
//   C Search           → `search` set, filtered client-side over the loaded entries
//   D Unranked User    → a signed-in gamer who isn't in the returned top 50
//   E Loading          → status "loading" (skeletons)
//   F Empty Results    → status "ready" with no visible entries (an unknown game lands here too)
//   G User Highlighted → the entry whose gamerId is the signed-in user's userId
// The API has no "my position" field, so a gamer ranked below the top 50 can't see their rank.

interface Result {
  key: string;
  entries: LeaderboardEntry[];
  error: string | null;
}

export type LeaderboardStatus = "loading" | "error" | "ready";

export function useLeaderboard() {
  const [game, setGame] = useState<GameFilter>(DEFAULT_GAME);
  const [search, setSearch] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [session] = useState(getSession);

  // A request is "loading" until a result for its exact key lands, so no state is set
  // synchronously inside the effect. Each visit refetches, so votes cast on the feed show up.
  const key = `${game ?? "all"}|${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboard(game, controller.signal).then(
      (response) =>
        setResult({ key, entries: [...response.entries].sort((a, b) => a.rank - b.rank), error: null }),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key, entries: [], error: error instanceof Error ? error.message : "Something went wrong." });
      },
    );
    return () => controller.abort();
  }, [game, key]);

  const status: LeaderboardStatus = result?.key !== key ? "loading" : result.error ? "error" : "ready";
  const entries = useMemo(() => (status === "ready" && result ? result.entries : []), [status, result]);

  /** Only gamers are ranked, so the "your position" card is for gamers only. */
  const isGamer = session?.role === ROLE.GAMER;
  const meId = isGamer ? session.userId : null;
  /** The signed-in gamer's entry, or null when they're outside the top 50 for this board. */
  const me = useMemo(() => (meId ? (entries.find((entry) => entry.gamerId === meId) ?? null) : null), [entries, meId]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.gamerTag, entry.displayName, entry.gamerId].some((value) => value.toLowerCase().includes(query)),
    );
  }, [entries, search]);

  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);
  const clearFilters = useCallback(() => {
    setGame(DEFAULT_GAME);
    setSearch("");
  }, []);

  return {
    status,
    error: status === "error" ? (result?.error ?? null) : null,
    game,
    setGame,
    search,
    setSearch,
    entries,
    visibleEntries,
    podium: entries.slice(0, 3),
    isGamer,
    meId,
    me,
    refresh,
    clearFilters,
  };
}

export type LeaderboardController = ReturnType<typeof useLeaderboard>;
