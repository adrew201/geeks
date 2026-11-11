# Wallet and withdrawals (reference)

Author: Gicharu. For: Rabasa (owner of wallet and withdrawals). Branch: `gicharu/donations-reference`, not for merge. Date: 11 Nov 2026.

This is a working, sandbox-tested version of the wallet view and withdrawals to PayPal (README section 15.4). It is built on the reference branch so Rabasa can reuse any part of it in Rabasa's own `payments` code. It follows the wallet shape in Rabasa's handoff (`balanceCents`, `pendingWithdrawalCents`, `entries`).

## Routes

| Route                              | Who                              | Request             | Response                                                                                         |
| ---------------------------------- | -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /api/v1/wallet`               | Signed-in user, own wallet only  | none                | `{ balanceCents, pendingWithdrawalCents, entries[] }`, each entry `{ id, kind, amount, currency, paypalRef, payoutStatus, createdAt }`, newest first, last 50 |
| `POST /api/v1/wallet/withdraw`     | Signed-in, `requireVerifiedAdult()` | `{ amount }` in integer cents, at least 100 | 201 `{ withdrawalId, amount, status: "PENDING", payoutBatchId }`                     |

| Error                          | When                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| 400 `VALIDATION_ERROR`         | Amount under 100 or not whole cents                                        |
| 400 `INSUFFICIENT_FUNDS`       | Amount is more than the balance                                            |
| 400 `PAYPAL_EMAIL_REQUIRED`    | The user has no `paypalEmail` stored                                       |
| 403 `NOT_VERIFIED_ADULT`       | The user isn't a verified adult                                            |
| 502 `PAYOUT_FAILED`            | PayPal refused the payout. The money is already back in the wallet         |

## How it works

1. The balance is the sum of the user's `WalletEntry` rows. There is no stored balance.
2. Withdraw, in one transaction with a per-user lock so a double click can't withdraw twice: check the amount is at most the balance, then write a `-amount WITHDRAWAL` entry with `payoutStatus: PENDING`.
3. Then call PayPal Payouts. It pays the `paypalEmail` stored on the user, never an email from the request, so a stolen login can't redirect money. `sender_batch_id = withdrawal-<entryId>` and `sender_item_id = <entryId>`.
4. If PayPal clearly refuses (a 4xx answer), a `+amount REVERSAL` entry puts the money back and the withdrawal becomes FAILED. On a timeout or network error the payout may still have gone through, so the entry stays PENDING and the webhook decides.
5. Webhooks, found by `sender_item_id`:
   - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` marks it PAID.
   - `PAYMENT.PAYOUTS-ITEM.FAILED`, `.RETURNED`, `.BLOCKED`, `.DENIED`, `.REFUNDED` and `.CANCELED` put the money back. They work from PENDING or PAID, and the REVERSAL is written once only (unique `paypalRef` + `kind`).
   - `.UNCLAIMED` and `.HELD` change nothing: the money can still arrive. An unclaimed payout that expires comes back as RETURNED.

## Sandbox test result

Run through the local API and ngrok, against the test gamer from the donation test (balance $4.75).

| Step                                  | Result                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `GET /wallet`                         | `balanceCents: 475`, entries `+500 DONATION`, `-25 FEE`                                   |
| Withdraw 500                          | 400 `INSUFFICIENT_FUNDS`                                                                  |
| Withdraw 475                          | 201, PayPal batch `97VB88SYKBJ8J`. Wallet: balance 0, pending 475                         |
| `PAYMENT.PAYOUTSBATCH.SUCCESS`        | Verified, no handler (IGNORED)                                                            |
| `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`      | First delivery: cert download timed out. PayPal retried 34 seconds later: verified, withdrawal PAID |
| `GET /wallet`                         | Balance 0, pending 0, withdrawal `PAID`                                                   |

Automated: `npx vitest run` passes 10 files and 82 tests, 13 of them wallet tests. `npx tsc --noEmit` is clean.

## For the team

- Nigel's wallet page reads the balance and entries from `GET /api/v1/gamers/:id/dashboard` (`walletBalance`, `walletEntries`), not from `GET /wallet`. Either the dashboard route includes them, or the page calls `/wallet`. Entries use `amount` (signed cents), the field name the web app expects.
- Nothing sets `User.paypalEmail` yet: signup doesn't ask for it and there is no profile setting. The demo needs it in the seed data for the gamer who withdraws, using a sandbox personal account's email.
- The sandbox webhook now also listens for the payout failure events listed above. The Render webhook needs the same list.
- The PayPal cert download timed out on the first webhook after each restart, three times today. A single immediate retry in `verify.ts` would avoid the 30-second delay.
