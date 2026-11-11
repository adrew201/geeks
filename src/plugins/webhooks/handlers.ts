// Rabasa owns. Written by Gicharu ahead of Rabasa's version; reconcile at merge.
// Contract the webhook route relies on (src/plugins/webhooks/index.ts):
//   - makeHandlers(fees) returns one handler per PayPal event type.
//   - A handler runs inside the same prisma.$transaction as the PaypalWebhookEvent insert
//     (15s timeout), so it must write through `tx`, not the global prisma client.
//   - Throw to roll back the event row too; the route answers 500 and PayPal retries.
//   - Event types with no handler are stored with status IGNORED.
import type { Prisma } from "@prisma/client";
import type { PaypalEvent } from "./service.js";
import { captureCheckoutOrder } from "../payments/service.js";
import { completeDonation, failDonation } from "../payments/donations.js";
import { markWithdrawalPaid, reverseWithdrawal } from "../payments/wallet.js";
import { onSubscriptionActivated, onSubscriptionEnded } from "../payments/subscriptions.js";

/** Basis points, read from env in the webhook route. */
export type Fees = {
  donationFeeBps: number;
  donationFeeBpsPaidGamer: number;
  bountyCommissionBps: number;
};

export type WebhookHandler = (tx: Prisma.TransactionClient, event: PaypalEvent) => Promise<void>;

type OrderResource = { id?: string; intent?: string };
type CaptureResource = {
  id?: string;
  status?: string;
  custom_id?: string;
  amount?: { value: string; currency_code: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
};

// A non-UUID in a uuid column makes Postgres abort the whole transaction, so check first.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The donation a capture belongs to: custom_id first, then the order ID. */
async function donationIdForCapture(tx: Prisma.TransactionClient, c: CaptureResource): Promise<string | undefined> {
  if (c.custom_id && UUID.test(c.custom_id)) {
    const byId = await tx.donation.findUnique({ where: { id: c.custom_id }, select: { id: true } });
    if (byId) return byId.id;
  }
  const orderId = c.supplementary_data?.related_ids?.order_id;
  if (!orderId) return undefined;
  return (await tx.donation.findUnique({ where: { paypalOrderId: orderId }, select: { id: true } }))?.id;
}

// Donation fees are fixed when the donation is created, so `fees` is unused until bounties land.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function makeHandlers(fees: Fees): Partial<Record<string, WebhookHandler>> {
  return {
    // Payer approved a pay-now order: capture it. Bounty orders (intent AUTHORIZE) are not handled here.
    "CHECKOUT.ORDER.APPROVED": async (tx, event) => {
      const order = event.resource as OrderResource | undefined;
      if (!order?.id || order.intent !== "CAPTURE") return;
      const donation = await tx.donation.findUnique({ where: { paypalOrderId: order.id } });
      if (!donation || donation.status !== "PENDING") return;
      const capture = await captureCheckoutOrder(order.id, `capture-${donation.id}`);
      // A COMPLETED capture is PayPal's direct answer, so credit now instead of waiting for the next webhook.
      await completeDonation(tx, donation.id, capture);
    },

    "PAYMENT.CAPTURE.COMPLETED": async (tx, event) => {
      const c = event.resource as CaptureResource | undefined;
      if (!c?.id || !c.amount) return;
      const donationId = await donationIdForCapture(tx, c);
      if (!donationId) return;
      await completeDonation(tx, donationId, {
        captureId: c.id,
        status: c.status ?? "COMPLETED",
        amountCents: Math.round(Number(c.amount.value) * 100),
        currency: c.amount.currency_code,
      });
    },

    "PAYMENT.CAPTURE.DENIED": async (tx, event) => {
      const c = event.resource as CaptureResource | undefined;
      if (!c) return;
      const donationId = await donationIdForCapture(tx, c);
      if (donationId) await failDonation(tx, donationId);
    },

    // Subscriptions: these events are the only thing that changes User.tier.
    "BILLING.SUBSCRIPTION.ACTIVATED": (tx, event) => onSubscriptionActivated(tx, event),
    "BILLING.SUBSCRIPTION.CANCELLED": (tx, event) => onSubscriptionEnded(tx, event, "CANCELLED"),
    "BILLING.SUBSCRIPTION.EXPIRED": (tx, event) => onSubscriptionEnded(tx, event, "EXPIRED"),
    "BILLING.SUBSCRIPTION.SUSPENDED": (tx, event) => onSubscriptionEnded(tx, event, "SUSPENDED"),

    // Withdrawals: sender_item_id is our WITHDRAWAL wallet entry id (set in wallet.ts).
    "PAYMENT.PAYOUTS-ITEM.SUCCEEDED": async (tx, event) => {
      const item = payoutItem(event);
      if (item) await markWithdrawalPaid(tx, item.entryId, item.payoutItemId);
    },
    // UNCLAIMED and HELD are not here on purpose: the money can still arrive, so the withdrawal
    // stays PENDING. An unclaimed payout that expires comes back as RETURNED.
    ...Object.fromEntries(
      PAYOUT_FAILURES.map((type): [string, WebhookHandler] => [
        type,
        async (tx, event) => {
          const item = payoutItem(event);
          if (item) await reverseWithdrawal(tx, item.entryId, item.payoutItemId);
        },
      ]),
    ),
  };
}

const PAYOUT_FAILURES = [
  "PAYMENT.PAYOUTS-ITEM.FAILED",
  "PAYMENT.PAYOUTS-ITEM.RETURNED",
  "PAYMENT.PAYOUTS-ITEM.BLOCKED",
  "PAYMENT.PAYOUTS-ITEM.DENIED",
  "PAYMENT.PAYOUTS-ITEM.REFUNDED",
  "PAYMENT.PAYOUTS-ITEM.CANCELED",
];

type PayoutItemResource = {
  payout_item_id?: string;
  sender_item_id?: string;
  payout_item?: { sender_item_id?: string };
};

function payoutItem(event: PaypalEvent): { entryId: string; payoutItemId: string } | undefined {
  const r = event.resource as PayoutItemResource | undefined;
  const entryId = r?.payout_item?.sender_item_id ?? r?.sender_item_id;
  if (!r?.payout_item_id || !entryId) return undefined;
  return { entryId, payoutItemId: r.payout_item_id };
}
