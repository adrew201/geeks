---
type: workstream
owner: Rabasa
day: Sat 7 – Mon 9 Nov
status: todo
priority: P0
blocks: [Obonyo bounties, donations, withdraw]
tags: [rabasa, paypal, payments]
---

# Payments Service (PayPal)

`src/plugins/payments/service.ts` is **the only PayPal client in the codebase**. [[Obonyo]]'s bounty code calls it, and nobody else calls PayPal. Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §9, §15 · Architecture: [[play2pro_architecture_tech_stack]]

## Current stub (repo `origin/main` @ `51d70b6`)
```ts
createOrder(amount: string, payeeId: string)      → { orderId, approvalUrl }
authorizeOrder(amount: string)                     → { orderId, approvalUrl }
captureOrder(authorizationId: string)              → { captureId }
voidAuthorization(authorizationId: string)         → void
payout(userId: string, amount: string)             → { payoutBatchId }
```
Every function throws `not implemented`.

## Proposed final contract
Keep the **exported names** (Obonyo already codes against them) but switch money to integer cents and add idempotency keys. Tell Obonyo before changing any signature.

```ts
type Cents = number;

// Token: cached in memory until ~60 s before expires_in; on a 401, refresh once and retry
getAccessToken(): Promise<string>;

// Donations (intent CAPTURE)
createOrder(i: { amountCents: Cents; gamerId: string; donorId: string; requestId: string })
  : Promise<{ orderId: string; approvalUrl: string }>;
captureDonationOrder(orderId: string): Promise<{ captureId: string; amountCents: Cents }>;

// Bounties (intent AUTHORIZE). Called by Obonyo
authorizeOrder(i: { amountCents: Cents; bountyId: string; requestId: string })
  : Promise<{ orderId: string; approvalUrl: string }>;
completeAuthorization(orderId: string): Promise<{ authorizationId: string; expiresAt: string }>;
captureOrder(authorizationId: string, i?: { requestId: string; finalCapture?: boolean })
  : Promise<{ captureId: string }>;           // captures an AUTHORIZATION (name kept for the contract)
voidAuthorization(authorizationId: string): Promise<void>;

// Payouts
payout(i: { userId: string; amountCents: Cents; walletEntryId: string })
  : Promise<{ payoutBatchId: string; payoutItemId?: string }>;

// Subscriptions → see [[Subscriptions]]
createSubscription(i: { userId: string; plan: "PAID_GAMER" | "COACH" })
  : Promise<{ subscriptionId: string; approvalUrl: string }>;
cancelSubscription(subscriptionId: string, reason: string): Promise<void>;
```

> [!question] Naming clash
> The README says `captureOrder()` "captures an authorization", but donations also need to capture an **order**. Proposal: keep `captureOrder(authorizationId)` for bounties as contracted, and add `captureDonationOrder(orderId)`. Logged in [[Open Decisions]].

## PayPal REST calls (sandbox base `https://api-m.sandbox.paypal.com`)

| Function | PayPal call | Notes |
| --- | --- | --- |
| `getAccessToken` | `POST /v1/oauth2/token` (basic auth, `grant_type=client_credentials`) | Cache by `expires_in` |
| `createOrder` | `POST /v2/checkout/orders` `intent: "CAPTURE"` | `purchase_units[0].custom_id = donation:<gamerId>`; return/cancel URLs from `WEB_ORIGIN`; approval link = `rel: "payer-action"` (with `payment_source.paypal.experience_context`) or `rel: "approve"` |
| `captureDonationOrder` | `POST /v2/checkout/orders/{id}/capture` | Run on return **or** on `CHECKOUT.ORDER.APPROVED`. Safe to call twice if `PayPal-Request-Id` is the same. |
| `authorizeOrder` | `POST /v2/checkout/orders` `intent: "AUTHORIZE"` | `custom_id = bounty:<bountyId>` |
| `completeAuthorization` | `POST /v2/checkout/orders/{id}/authorize` | Authorization ID at `purchase_units[0].payments.authorizations[0].id` |
| `captureOrder` | `POST /v2/payments/authorizations/{authId}/capture` | `final_capture: true` |
| `voidAuthorization` | `POST /v2/payments/authorizations/{authId}/void` | Treat an "already voided" error as success |
| `payout` | `POST /v1/payments/payouts` | `sender_batch_header.sender_batch_id = walletEntryId` (dedupe); item `recipient_type: "EMAIL"`, `receiver = user.paypalEmail` |
| `createSubscription` | `POST /v1/billing/subscriptions` | `plan_id` from env; `custom_id = userId`; approval = `rel: "approve"` |
| `cancelSubscription` | `POST /v1/billing/subscriptions/{id}/cancel` | |
| order status fallback | `GET /v2/checkout/orders/{id}` | Demo fallback when webhooks lag |

**Money formatting:** `(cents / 100).toFixed(2)` → `"12.50"`, currency `PAYPAL_CURRENCY` (USD in sandbox). The wireframes show **KSh**. KES support in PayPal is limited, so keep USD for the demo; see [[Open Decisions]].

**Idempotency:** send a `PayPal-Request-Id` header on every POST (e.g. `donation:<localId>`, `bounty-capture:<bountyId>`). A double-click on bounty confirm then can't capture twice, even before Obonyo's row lock.

## Routes owned here

| Route | Guard | Flow |
| --- | --- | --- |
| `POST /api/v1/donations` `{ gamerId, amount }` | any user; recipient must be a verified adult | `createOrder` → `{ approvalUrl, orderId }`. Ledger is written by [[Webhook Handlers]] on capture. |
| `POST /api/v1/donations/:orderId/capture` *(proposed)* | donor | Return-URL capture so the demo doesn't wait for webhooks |
| `POST /api/v1/subscriptions` | GAMER or COACH | → [[Subscriptions]] |
| `POST /api/v1/wallet/withdraw` | owner + verified adult | → [[Wallet Ledger & Payouts]] |

## Edge cases
- Donation to self → 400. Amount below the minimum (e.g. < 100 cents) or above the cap → 400.
- Fee rounding: `fee = Math.round(amountCents * bps / 10_000)`. Use PAID gamer BPS if the recipient's tier is PAID **at capture time**.
- An authorization lasts about 29 days, with a 3-day honour period (confirm in PayPal docs). Reject bounty deadlines past a configured cap (`BOUNTY_MAX_DEADLINE_HOURS`, proposed).
- PayPal 4xx/5xx → `AppError("PAYPAL_ERROR", 502)`. Log `debug_id` from the response, **never** payer PII.
- Sandbox Payouts need the platform business account to have a balance and Payouts enabled (README §9.1–9.2). Set this up first.

## Tests
Location: `tests/payments/`
- [ ] Unit: cents→string formatting, fee rounding at boundaries, token cache expiry/refresh on 401 (mock `fetch`)
- [ ] Unit: approval-link extraction handles both `payer-action` and `approve` rel
- [ ] Sandbox (manual / Postman): donation, bounty authorize → capture, authorize → void, payout

## Done when
- [ ] Obonyo can run a full bounty: authorize → submit → verify → `captureOrder` → `payout` (Mon "done when")
- [ ] A sandbox donation approved in the browser credits the gamer's wallet after the webhook (Sun "done when")
- [ ] Forged or failed PayPal calls surface as `PAYPAL_ERROR` without crashing the request

Related: [[Wallet Ledger & Payouts]] · [[Webhook Handlers]] · [[Gicharu]] · [[Wireframes Index]] (screens 13–15 show the approval/pending UX)
