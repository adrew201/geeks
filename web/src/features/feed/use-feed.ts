import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useToast } from "../../components/ui/use-toast.ts";
import { getSession } from "../../lib/session.ts";
import { TIER, type FeedItem, type FeedPage, type VoteDirection } from "../../types/api.ts";
import { classifyVoteError, fetchFeed, voteOnClip, type VoteFailureKind } from "./api.ts";
import { SELECTABLE_STATUSES } from "./vote-options.ts";

// The 09D state toolbar as real states:
//   A New Clip        → vote.status "idle"
//   B Option Selected → "selected"
//   C Vote Submitted  → "submitted" (then auto-advance)
//   D Already Voted   → "already-voted" (voted earlier this session, or the API says so)
//   E Loading Clip    → phase "loading" (first page, or fetching the next page)
//   F Empty Feed      → phase "empty"
//   G Unavailable     → "unavailable" (the clip is gone: vote returned NOT_FOUND)
//   H Vote Failed     → "failed"
// "submitting" is the in-flight step between B and C/D/G/H.

export type VoteStatus =
  | "idle"
  | "selected"
  | "submitting"
  | "submitted"
  | "already-voted"
  | "failed"
  | "unavailable";

export type FeedPhase = "loading" | "error" | "empty" | "ready";

export interface VoteState {
  status: VoteStatus;
  direction: VoteDirection | null;
  error: string | null;
}

/** How long "Vote Submitted" stays on screen before the next clip. */
const SUBMITTED_DWELL_MS = 900;

const NEW_CLIP: VoteState = { status: "idle", direction: null, error: null };

interface FeedState {
  items: FeedItem[];
  index: number;
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  loadError: string | null;
  vote: VoteState;
  /** Clips voted on in this session, so revisits show "already voted". */
  voted: Record<string, VoteDirection>;
}

type FeedAction =
  | { type: "load-start" }
  | { type: "load-success"; page: FeedPage; hideAds: boolean }
  | { type: "load-failure"; message: string }
  | { type: "select"; direction: VoteDirection }
  | { type: "submit-start"; direction: VoteDirection }
  | { type: "submit-success"; clipId: string; direction: VoteDirection }
  | { type: "submit-failure"; kind: VoteFailureKind; clipId: string; direction: VoteDirection; message: string }
  | { type: "advance" };

const INITIAL_STATE: FeedState = {
  items: [],
  index: 0,
  cursor: null,
  hasMore: true,
  loading: true,
  loadError: null,
  vote: NEW_CLIP,
  voted: {},
};

function voteStateFor(item: FeedItem | undefined, voted: FeedState["voted"]): VoteState {
  if (item?.kind === "clip") {
    const direction = voted[item.clip.id];
    if (direction) return { status: "already-voted", direction, error: null };
  }
  return NEW_CLIP;
}

function reducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "load-start":
      return { ...state, loading: true, loadError: null };
    case "load-success": {
      const incoming = action.hideAds
        ? action.page.items.filter((item) => item.kind !== "ad")
        : action.page.items;
      const items = [...state.items, ...incoming];
      return {
        ...state,
        items,
        cursor: action.page.nextCursor,
        hasMore: action.page.nextCursor !== null,
        loading: false,
        vote: voteStateFor(items[state.index], state.voted),
      };
    }
    case "load-failure":
      return { ...state, loading: false, loadError: action.message };
    case "select":
      if (!SELECTABLE_STATUSES.includes(state.vote.status)) return state;
      return { ...state, vote: { status: "selected", direction: action.direction, error: null } };
    case "submit-start":
      return { ...state, vote: { status: "submitting", direction: action.direction, error: null } };
    case "submit-success":
      return {
        ...state,
        vote: { status: "submitted", direction: action.direction, error: null },
        voted: { ...state.voted, [action.clipId]: action.direction },
      };
    case "submit-failure":
      if (action.kind === "already-voted") {
        return {
          ...state,
          vote: { status: "already-voted", direction: action.direction, error: null },
          voted: { ...state.voted, [action.clipId]: action.direction },
        };
      }
      return {
        ...state,
        vote: {
          status: action.kind === "unavailable" ? "unavailable" : "failed",
          direction: action.direction,
          error: action.message,
        },
      };
    case "advance": {
      const index = state.index + 1;
      return { ...state, index, vote: voteStateFor(state.items[index], state.voted) };
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useFeed() {
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  // README §14: ads are interleaved for FREE users only. The API already decides; this
  // also drops any ad item if the token says PAID (e.g. right after an upgrade).
  const [hideAds] = useState(() => getSession()?.tier === TIER.PAID);

  const stateRef = useRef(state);
  const controllerRef = useRef<AbortController | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const submitting = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  });

  const runLoad = useCallback(
    (cursor: string | null) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      fetchFeed(cursor, controller.signal).then(
        (page) => dispatch({ type: "load-success", page, hideAds }),
        (error: unknown) => {
          if (!isAbort(error)) dispatch({ type: "load-failure", message: errorMessage(error) });
        },
      );
    },
    [hideAds],
  );

  // First page. INITIAL_STATE already has loading: true, so nothing is dispatched synchronously.
  useEffect(() => {
    runLoad(null);
    return () => {
      controllerRef.current?.abort();
      clearTimeout(advanceTimer.current);
    };
  }, [runLoad]);

  const retry = useCallback(() => {
    dispatch({ type: "load-start" });
    runLoad(stateRef.current.cursor);
  }, [runLoad]);

  const advance = useCallback(() => {
    clearTimeout(advanceTimer.current);
    const { index, items, hasMore, loading, cursor } = stateRef.current;
    dispatch({ type: "advance" });
    // Reaching the end of what's loaded: fetch the next page (state E).
    if (index + 1 >= items.length && hasMore && !loading) {
      dispatch({ type: "load-start" });
      runLoad(cursor);
    }
  }, [runLoad]);

  const select = useCallback((direction: VoteDirection) => dispatch({ type: "select", direction }), []);

  const submit = useCallback(
    async (direction: VoteDirection) => {
      const { items, index, vote } = stateRef.current;
      const item = items[index];
      if (item?.kind !== "clip" || !SELECTABLE_STATUSES.includes(vote.status) || submitting.current) return;
      const clipId = item.clip.id;

      submitting.current = true;
      dispatch({ type: "submit-start", direction });
      try {
        await voteOnClip(clipId, direction);
        dispatch({ type: "submit-success", clipId, direction });
        toast.show("Your vote has been recorded.", { tone: "success" });
        advanceTimer.current = setTimeout(advance, SUBMITTED_DWELL_MS);
      } catch (error) {
        const kind = classifyVoteError(error);
        dispatch({ type: "submit-failure", kind, clipId, direction, message: errorMessage(error) });
      } finally {
        submitting.current = false;
      }
    },
    [advance, toast],
  );

  const current = state.items[state.index] ?? null;
  const phase: FeedPhase = current
    ? "ready"
    : state.loadError
      ? "error"
      : state.hasMore
        ? "loading"
        : "empty";

  return {
    phase,
    current,
    vote: state.vote,
    loadError: state.loadError,
    select,
    submit,
    advance,
    retry,
  };
}

export type FeedController = ReturnType<typeof useFeed>;
