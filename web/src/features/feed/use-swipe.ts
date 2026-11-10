import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { VOTE_DIRECTION, type VoteDirection } from "../../types/api.ts";

// Swipe-to-rank gesture. The prototypes name it (09 title "Swipe-to-Rank Reel", 09M:261
// "SWIPE FEED" badge) but never implement it (docs/ui-audit.md §4, §5c). Decision 1:
// swipe right = UP, swipe left = DOWN.
//
// Pointer events + CSS transforms only. While dragging, transform and --swipe are written
// straight to the element (no re-render per move). --swipe runs from -1 (full DOWN) to 1
// (full UP), so children can fade hints in with CSS alone. `touch-action: pan-y` on the
// card keeps vertical page scroll on touch screens; a vertical pan fires pointercancel and
// the card snaps back.

/** Drag distance (px) that commits a vote. */
const COMMIT_DISTANCE = 110;
/** Degrees of tilt per px of drag. */
const TILT_PER_PX = 1 / 20;
/** Matches the 0.2s ease used for every prototype transition (docs/ui-audit.md §5b). */
const TRANSITION_MS = 200;

const INTERACTIVE = "a, button, input, textarea, select, [role='button']";

interface DragState {
  pointerId: number;
  startX: number;
  dx: number;
}

export interface UseSwipeOptions {
  enabled: boolean;
  onSwipe: (direction: VoteDirection) => void;
}

export function useSwipe<T extends HTMLElement>({ enabled, onSwipe }: UseSwipeOptions) {
  const ref = useRef<T>(null);
  const drag = useRef<DragState | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  });

  useEffect(() => () => clearTimeout(commitTimer.current), []);

  const paint = useCallback((dx: number, animate: boolean) => {
    const element = ref.current;
    if (!element) return;
    element.style.transition = animate ? `transform ${TRANSITION_MS}ms ease` : "none";
    element.style.transform = dx === 0 ? "" : `translateX(${dx}px) rotate(${dx * TILT_PER_PX}deg)`;
    element.style.setProperty("--swipe", String(Math.max(-1, Math.min(1, dx / COMMIT_DISTANCE))));
  }, []);

  /** Snap the card back to the centre (e.g. after a failed vote). */
  const reset = useCallback(() => {
    clearTimeout(commitTimer.current);
    drag.current = null;
    paint(0, true);
  }, [paint]);

  // If voting gets disabled mid-drag (or a fly-out is pending), put the card back.
  useEffect(() => {
    if (!enabled && drag.current) reset();
  }, [enabled, reset]);

  const onPointerDown = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabled || !event.isPrimary || event.button !== 0) return;
      if ((event.target as Element).closest(INTERACTIVE)) return;
      drag.current = { pointerId: event.pointerId, startX: event.clientX, dx: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
      paint(0, false);
    },
    [enabled, paint],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.dx = event.clientX - current.startX;
      paint(current.dx, false);
    },
    [paint],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<T>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null;
      if (Math.abs(current.dx) < COMMIT_DISTANCE) {
        paint(0, true);
        return;
      }
      const direction = current.dx > 0 ? VOTE_DIRECTION.UP : VOTE_DIRECTION.DOWN;
      // Fly out past the viewport edge, then hand the vote over.
      paint(Math.sign(current.dx) * window.innerWidth, true);
      commitTimer.current = setTimeout(() => onSwipeRef.current(direction), TRANSITION_MS);
    },
    [paint],
  );

  const onPointerCancel = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    paint(0, true);
  }, [paint]);

  return {
    reset,
    bind: { ref, onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
