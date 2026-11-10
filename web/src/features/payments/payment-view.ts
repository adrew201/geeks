import { PAYMENT_PURPOSE, type PaymentPurpose } from "../../types/api.ts";
import { orderOutcome } from "./api.ts";
import type { OrderStatusState } from "./use-order-status.ts";

// The 15D state toolbar as real states (A–G). Returning from PayPal is never success:
// "confirmed" only comes from the backend saying COMPLETED.

export type PaymentView =
  | "pending" // A
  | "checking" // B
  | "confirmed" // C
  | "still-pending" // D
  | "failed" // E
  | "cancelled" // F
  | "expired"; // G

export function paymentView(status: Pick<OrderStatusState, "order" | "checking" | "slow">, cancelledHint: boolean): PaymentView {
  const outcome = status.order ? orderOutcome(status.order.status) : "pending";
  if (outcome !== "pending") return outcome;
  if (status.checking) return "checking";
  // PayPal's cancel link: PayPal sends no webhook for it, so the URL is the only signal.
  // Trusting it can only ever show "not paid", never a false success.
  if (cancelledHint) return "cancelled";
  return status.slow ? "still-pending" : "pending";
}

export function isTerminal(view: PaymentView): boolean {
  return view === "confirmed" || view === "failed" || view === "cancelled" || view === "expired";
}

/** Per-purpose wording, so bounty funding and subscriptions reuse PaymentStatus. */
export interface PurposeCopy {
  /** "donation" */
  noun: string;
  /** Third tracker step (15 had "3. Content unlock", removed with decision 3). */
  finalStep: string;
  finalStepDescription: (recipient: string | undefined) => string;
  /** Title and badge once the backend confirms. Bounty funds are held, not captured. */
  confirmedTitle: string;
  confirmedBadge: string;
  confirmedDescription: (recipient: string | undefined) => string;
  /** Restart button label for failed / cancelled / expired. */
  restartLabel: string;
}

export const PURPOSE_COPY: Record<PaymentPurpose, PurposeCopy> = {
  [PAYMENT_PURPOSE.DONATION]: {
    noun: "donation",
    finalStep: "Donation delivered",
    finalStepDescription: (recipient) =>
      `The donation is credited to ${recipient ? `${recipient}'s` : "the gamer's"} wallet once payment is verified.`,
    confirmedTitle: "Payment confirmed!",
    confirmedBadge: "Payment verified",
    confirmedDescription: (recipient) =>
      `PayPal confirmed your payment and your donation has been credited to ${recipient ? `${recipient}'s` : "the gamer's"} wallet. Thanks for backing them!`,
    restartLabel: "Donate again",
  },
  [PAYMENT_PURPOSE.BOUNTY]: {
    noun: "bounty funding",
    finalStep: "Bounty published",
    finalStepDescription: () => "The bounty opens once PayPal confirms the funds are held.",
    confirmedTitle: "Funds held, bounty open",
    confirmedBadge: "Funds held",
    confirmedDescription: () =>
      "PayPal confirmed the reward is held. Nothing is charged until you confirm a winner, and the hold is released if nobody wins by the deadline.",
    restartLabel: "Try funding again",
  },
  [PAYMENT_PURPOSE.SUBSCRIPTION]: {
    noun: "subscription",
    finalStep: "Plan activated",
    finalStepDescription: () => "Your plan activates once PayPal confirms the subscription.",
    confirmedTitle: "Payment confirmed!",
    confirmedBadge: "Payment verified",
    confirmedDescription: () => "PayPal confirmed your subscription. Your plan is now active.",
    restartLabel: "Try again",
  },
};
