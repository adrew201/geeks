import { useCallback, useEffect, useState } from "react";
import type { PaymentOrder } from "../../types/api.ts";
import { fetchOrder, isAbort, isNotFound, isUnauthenticated, orderOutcome } from "./api.ts";

// Real polling for /pay/return (15D only simulated a 2s manual refresh; 15 had no background
// polling at all). Rules:
// - Poll GET /orders/:id every POLL_INTERVAL_MS until the order is terminal
//   (confirmed / failed / cancelled / expired).
// - After STILL_PENDING_AFTER_MS without a result, the page switches to "still pending"
//   (15D state D: "This can take up to 2 minutes").
// - Stop after POLL_WINDOW_MS. Manual Refresh checks now and opens a fresh window.
// - Skip checks while the tab is hidden (the timer keeps running, the request doesn't).
// - Network/5xx errors don't end polling; 404 stops it (unknown order); 401 stops it
//   (api-client clears the session and RequireAuth sends the user to /login and back).

export const POLL_INTERVAL_MS = 3_000;
export const STILL_PENDING_AFTER_MS = 30_000;
export const POLL_WINDOW_MS = 120_000;

export interface OrderStatusState {
  order: PaymentOrder | null;
  /** A manual refresh is in flight (15D state B "Checking"). */
  checking: boolean;
  /** STILL_PENDING_AFTER_MS passed without a terminal status. Sticky. */
  slow: boolean;
  /** Automatic checks are running. False once terminal, timed out, or stopped. */
  polling: boolean;
  /** The last check failed for a transient reason (we keep trying). */
  checkFailed: boolean;
  notFound: boolean;
}

const INITIAL: OrderStatusState = {
  order: null,
  checking: false,
  slow: false,
  polling: true,
  checkFailed: false,
  notFound: false,
};

export interface UseOrderStatusOptions {
  /** Check once and don't poll (e.g. the payer came back from PayPal's cancel link). */
  once?: boolean;
}

export function useOrderStatus(orderId: string | null, { once = false }: UseOrderStatusOptions = {}) {
  const [state, setState] = useState<OrderStatusState>(INITIAL);
  // Bumped by refresh() to restart the effect with a new polling window.
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const elapsed = () => Date.now() - startedAt;
    const windowOpen = () => !once && elapsed() < POLL_WINDOW_MS;

    function next() {
      if (windowOpen()) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      } else {
        setState((s) => ({ ...s, polling: false, checking: false, slow: s.slow || !once }));
      }
    }

    async function tick() {
      if (document.visibilityState === "hidden") {
        setState((s) => ({ ...s, slow: s.slow || elapsed() >= STILL_PENDING_AFTER_MS }));
        next();
        return;
      }
      try {
        const order = await fetchOrder(orderId!, controller.signal);
        const terminal = orderOutcome(order.status) !== "pending";
        setState((s) => ({
          ...s,
          order,
          checking: false,
          checkFailed: false,
          slow: s.slow || elapsed() >= STILL_PENDING_AFTER_MS,
          polling: !terminal && windowOpen(),
        }));
        if (!terminal) next();
      } catch (error) {
        if (isAbort(error)) return;
        if (isNotFound(error) || isUnauthenticated(error)) {
          setState((s) => ({ ...s, checking: false, polling: false, notFound: isNotFound(error) }));
          return;
        }
        setState((s) => ({
          ...s,
          checking: false,
          checkFailed: true,
          slow: s.slow || elapsed() >= STILL_PENDING_AFTER_MS,
        }));
        next();
      }
    }

    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, once, run]);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, checking: true, polling: true }));
    setRun((value) => value + 1);
  }, []);

  return { ...state, refresh };
}
