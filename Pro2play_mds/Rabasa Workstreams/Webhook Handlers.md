---
type: workstream
owner: Rabasa
co-owner: Gicharu
day: Sun 8 Nov
status: todo
priority: P0
tags: [rabasa, paypal, webhooks]
---

# Webhook Handlers

`src/plugins/webhooks/handlers.ts` is Rabasa's. Signature verification and event-ID dedupe are [[Gicharu]]'s and run **first**; handlers only ever see verified, first-time events. Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §9.4

## Pipeline (`POST /api/v1/webhooks/paypal`)
1. Raw body kept (no re-serialisation) — *Gicharu*
2. `POST /v1/notifications/verify-webhook-signature` → must be `SUCCESS`, else 400 — *Gicharu*
3. Insert `WebhookEvent(paypalEventId)`; duplicate → 200 no-op — *Gicharu*
4. `dispatch(event)` by `event_type` → **Rabasa's handlers**
5. Return 200 fast; heavy work goes on a queue

**Interface to agree with Gicharu:**
```ts
export type PayPalEvent = { id: string; event_type: string; resource: any; create_time: string };
export const handlers: Record<string, (e: PayPalEvent, tx: Prisma.TransactionClient) => Promise<void>>;
```
Proposal: run the handler and the `WebhookEvent` insert in the **same transaction**. A handler crash then rolls back the dedupe row, and PayPal's retry gets another chance.

## Event map

| `event_type` | Handler | Effect |
| --- | --- | --- |
| `CHECKOUT.ORDER.APPROVED` | `onOrderApproved` | `custom_id` starts with `donation:` → `captureDonationOrder`; with `bounty:` → `completeAuthorization` (hand over to bounties) |
| `PAYMENT.CAPTURE.COMPLETED` | `onCaptureCompleted` | Donation → `DONATION` + `FEE` entries (ref = capture ID). A bounty capture is recorded by Obonyo's confirm flow; ignore it here or no-op on the unique ref. |
| `PAYMENT.AUTHORIZATION.CREATED` | `onAuthorizationCreated` | Call Obonyo's `bounties.markFunded(bountyId, authorizationId)` → bounty `OPEN` + expiry job |
| `PAYMENT.AUTHORIZATION.VOIDED` | `onAuthorizationVoided` | Obonyo's `bounties.markExpired` (idempotent) |
| `BILLING.SUBSCRIPTION.ACTIVATED` | `onSubscriptionActivated` | `ACTIVE`, tier → PAID ([[Subscriptions]]) |
| `BILLING.SUBSCRIPTION.CANCELLED` / `.EXPIRED` / `.SUSPENDED` | `onSubscriptionEnded` | tier → FREE (unless another one is active) |
| `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` | `onPayoutSucceeded` | Withdrawal → PAID |
| `PAYMENT.PAYOUTS-ITEM.FAILED` / `.BLOCKED` / `.RETURNED` / `.DENIED` / `.CANCELED` | `onPayoutFailed` | `REVERSAL` entry ([[Wallet Ledger & Payouts]]) |
| anything else | — | Log `event_type` + `id` and return 200 |

## Rules
- **Handlers must be idempotent on their own** (belt and braces on top of dedupe): use unique refs and status checks such as "only flip if not already ACTIVE".
- Don't trust amounts from the client. Use the amount in the verified `resource`.
- Never log full `resource` payloads (payer PII). Log the event ID, type and our internal IDs.
- Cross-plugin calls go through exported service functions (`bounties/service.ts`), never direct writes to another owner's tables.

## Local testing
- `ngrok http 3000` → sandbox webhook → copy the ID into `PAYPAL_WEBHOOK_ID` (one "local" webhook per dev)
- Dashboard **Webhooks simulator** checks routing and verification, but its events aren't tied to real orders
- **Demo fallback:** the Postman "Simulate webhook" request replays a signed sample (see [[Postman Collection]]), plus order-status polling

## Done when
- [ ] Sun evening sync (Rabasa + Obonyo + Gicharu): first real donation through the webhook credits the wallet
- [ ] Demo: "Forged webhook (bad signature) is rejected" (Gicharu's side, tested together)
- [ ] Every event above has at least one Postman sample

Related: [[Payments Service (PayPal)]] · [[Subscriptions]] · [[Wallet Ledger & Payouts]] · [[Obonyo]]
