// Rabasa owns. PLACEHOLDER: replace with Rabasa's makeHandlers at merge time.
// Contract the webhook route relies on (src/plugins/webhooks/index.ts):
//   - makeHandlers(fees) returns one handler per PayPal event type, e.g. "PAYMENT.CAPTURE.COMPLETED".
//   - A handler runs inside the same prisma.$transaction as the PaypalWebhookEvent insert
//     (15s timeout), so it must write through `tx`, not the global prisma client.
//   - Throw to roll back the event row too; the route answers 500 and PayPal retries.
//   - Event types with no handler are stored with status IGNORED.
import type { Prisma } from "@prisma/client";
import type { PaypalEvent } from "./service.js";

/** Basis points, read from env in the webhook route. */
export type Fees = {
  donationFeeBps: number;
  donationFeeBpsPaidGamer: number;
  bountyCommissionBps: number;
};

export type WebhookHandler = (tx: Prisma.TransactionClient, event: PaypalEvent) => Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function makeHandlers(fees: Fees): Partial<Record<string, WebhookHandler>> {
  return {};
}
