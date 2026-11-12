import { ROUTES } from "../../components/layout/nav-config.ts";
import { env } from "../../config/env.ts";
import { PAYPAL_RETURN_PARAM, type Cents, type PaymentPurpose } from "../../types/api.ts";

// Leaving for PayPal and coming back.
// - The approval URL comes from our backend, but it's still checked before the browser goes
//   anywhere: https only, PayPal hosts only. Never log it; it carries the order token.
// - A little non-secret context (amount, recipient, where to go back to) is kept in
//   sessionStorage so /pay/return can show a summary even if GET /orders/:id is sparse.

/** paypal.com and its subdomains (www.paypal.com, www.sandbox.paypal.com). */
function isPayPalHost(hostname: string): boolean {
  return hostname === "paypal.com" || hostname.endsWith(".paypal.com");
}

/** The parsed approval URL if it's safe to send the payer to, otherwise null. */
export function safeApprovalUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return isPayPalHost(url.hostname) ? url : null;
}

/**
 * Mock mode only: where "approving on PayPal" lands. The mock approval URL is a fake sandbox
 * link, so instead of leaving the app we come straight back as PayPal would, keeping the
 * `?mock=` scenario so /pay/return can act it out.
 */
export function mockReturnPath(orderId: string): string {
  const params = new URLSearchParams({ [PAYPAL_RETURN_PARAM.TOKEN]: orderId });
  const scenario = new URLSearchParams(window.location.search).get("mock");
  if (scenario) params.set("mock", scenario);
  return `${ROUTES.payReturn}?${params.toString()}`;
}

/** True when the redirect should be simulated in-app (see mockReturnPath). */
export const simulateApproval = env.useMocks;

/**
 * Only orders the mock API created are simulated. A real PayPal order must always go to PayPal,
 * even when the rest of the app runs on mocks (hybrid mode, VITE_REAL_API includes /api/v1/donations).
 */
export function shouldSimulateApproval(orderId: string): boolean {
  return simulateApproval && orderId.startsWith("MOCK-");
}

/* ------------------------------ checkout context ------------------------------ */

export interface CheckoutContext {
  orderId: string;
  purpose: PaymentPurpose;
  amount: Cents;
  /** Display name of who gets the money (gamer tag for donations). */
  recipientName?: string;
  /** In-app path for "Back to …" after the payment. */
  returnPath?: string;
  /** Label for the returnPath button. Default: "Back to <recipient>'s Gamer ID". */
  returnLabel?: string;
  /** In-app path that restarts the payment (failed / cancelled / expired). */
  retryPath?: string;
}

const CONTEXT_KEY = "play2pro.checkout";

export function saveCheckoutContext(context: CheckoutContext): void {
  try {
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
  } catch {
    /* storage unavailable: /pay/return falls back to what the order endpoint returns */
  }
}

/** The stored context, only if it belongs to this order. */
export function loadCheckoutContext(orderId: string): CheckoutContext | null {
  try {
    const raw = sessionStorage.getItem(CONTEXT_KEY);
    if (!raw) return null;
    const context = JSON.parse(raw) as Partial<CheckoutContext>;
    if (context.orderId !== orderId || typeof context.amount !== "number") return null;
    return {
      ...(context as CheckoutContext),
      returnPath: inAppPath(context.returnPath),
      retryPath: inAppPath(context.retryPath),
      returnLabel: typeof context.returnLabel === "string" ? context.returnLabel : undefined,
    };
  } catch {
    return null;
  }
}

/** Only same-app absolute paths are followed. */
function inAppPath(path: unknown): string | undefined {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : undefined;
}
