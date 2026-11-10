---
type: workstream
owner: Rabasa
day: Sun 8 – Mon 9 Nov
status: todo
priority: P0
tags: [rabasa, wallet, ledger, payouts]
---

# Wallet Ledger & Payouts

Append-only `WalletEntry` ledger, balance queries and the withdraw flow. Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §13 "Money conventions", §15.4 · Schema: [[Schema Reconciliation]]

## Invariants (non-negotiable)
1. Money is **integer cents**. No floats, no Decimal on this table.
2. **Balance = `SUM(amount)`** over the user's `WalletEntry` rows. No mutable balance column.
3. Every credit and debit for one business event is written in **one `prisma.$transaction`**.
4. `paypalRef` (+ `kind`) is unique, so a replayed webhook can't credit twice. Catch Prisma `P2002` and treat it as "already applied".
5. Rows are never updated or deleted. Corrections are new `REVERSAL` rows.

## Entry kinds and who writes them

| Kind | Sign | Written by | Trigger |
| --- | --- | --- | --- |
| `DONATION` | + | [[Webhook Handlers]] | `PAYMENT.CAPTURE.COMPLETED` for a donation order |
| `FEE` | − | same transaction as the credit | Donation fee (`DONATION_FEE_BPS`) or bounty commission (`BOUNTY_COMMISSION_BPS`) |
| `BOUNTY` | + | bounty confirm flow ([[Obonyo]] calls a ledger helper) | After `captureOrder` succeeds |
| `AD_SHARE` | + | ads ([[Obonyo]]) | Revenue share for PAID gamers; can stay seeded for the demo |
| `WITHDRAWAL` | − | `POST /wallet/withdraw` | Written **before** calling Payouts |
| `REVERSAL` | + | [[Webhook Handlers]] | `PAYMENT.PAYOUTS-ITEM.FAILED` / `.RETURNED` / `.BLOCKED` / `.DENIED` / `.CANCELED` / `.UNCLAIMED` (if unclaimed past the window) |

**Exported helper (for Obonyo):** `ledger.credit(tx, { userId, amountCents, kind, paypalRef, feeBps? })` writes the credit and its fee row together inside the caller's transaction.

> [!question] Bounty payout: wallet or direct?
> The README bounty diagram calls `payout()` straight to the gamer **and** writes wallet entries. Pick one so money isn't counted twice. Recommended for the demo: capture → write `BOUNTY` + `FEE` to the wallet → the gamer withdraws (one payout path to test). Logged in [[Open Decisions]].

## Withdraw flow
`POST /api/v1/wallet/withdraw { amount }`. Guards: `requireAuth`, owner, `requireVerifiedAdult` (Gicharu).

1. In a transaction with `SELECT … FOR UPDATE` on the user row (or a Postgres advisory lock per user), compute the balance and reject if `amount > balance` (`INSUFFICIENT_FUNDS`) or below the minimum.
2. Insert `WITHDRAWAL −amount` with status `PENDING`.
3. Commit, then call `payments.payout({ walletEntryId, … })`. Store `payoutBatchId` / `payoutItemId`.
4. If the Payouts call itself throws, write a `REVERSAL` right away.
5. Webhooks: `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` marks it paid; failure events write a `REVERSAL` (once, keyed on `payoutItemId`).

Payout status needs somewhere to live: add `status` + `payoutItemId` columns to WalletEntry (status is the only field ever updated), or add a tiny `Payout` table. Decide in [[Schema Reconciliation]].

## Read API (used by [[Profiles & Dashboard API]] and [[Nigel]])
- `GET /api/v1/wallet` *(proposed)* → `{ balanceCents, pendingWithdrawalCents, entries: [...] }`, paged, owner only
- Wireframe screen 08 also wants a time series and a by-category breakdown: `GROUP BY date_trunc('week', createdAt), kind`

## Edge cases
- Two concurrent withdraws: the row lock makes the second one see the reduced balance
- A donation captured while the recipient is not a verified adult: block it at donation creation, not at capture
- Webhook arrives before the capture call returns: the unique ref makes the second write a no-op
- Currency mismatch on a capture (not `PAYPAL_CURRENCY`): log it and don't credit

## Done when
- [ ] Demo: "Donate with push-to-pay; wallet updates after the webhook"
- [ ] Demo: "Gamer withdraws from the wallet via Payouts"
- [ ] Replaying the same webhook 3× leaves the balance unchanged (Postman "simulate webhook")

Related: [[Payments Service (PayPal)]] · [[Webhook Handlers]] · [[Gicharu]] · [[Fabiola]] (Postman tests)
