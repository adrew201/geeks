# Escrow sandbox test

Author: Gicharu. For: Rabasa (payments service, handlers) and Obonyo (bounty routes, expiry job). Date: 11 Nov 2026.

This file records a run of the full bounty escrow money path against the PayPal sandbox, using a throwaway script and no repo code: authorize, capture, void, payout. The results below are PayPal's actual answers, to build `authorizeOrder()`, `captureOrder()`, `voidAuthorization()`, `payout()` and the escrow handlers against.

## Result

| Step                                                     | PayPal call                                              | Result                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Create bounty order, $10                                 | `POST /v2/checkout/orders`, `intent: AUTHORIZE`          | 201, status `PAYER_ACTION_REQUIRED`, approval link rel `payer-action`     |
| Sponsor approves                                         | Buyer approves in the PayPal page                        | Order `APPROVED`, webhook `CHECKOUT.ORDER.APPROVED`                       |
| Hold the money                                           | `POST /v2/checkout/orders/{id}/authorize`                | 201, authorization `CREATED`, `expiration_time` 29 days later (2026-12-10) |
| Winner confirmed: take the money                         | `POST /v2/payments/authorizations/{authId}/capture`, `{ final_capture: true }` | 201, capture `COMPLETED`, amount 10.00                |
| Capture the same authorization again                     | same, new `PayPal-Request-Id`                            | 422 `AUTHORIZATION_ALREADY_CAPTURED`                                      |
| No winner: release the hold                              | `POST /v2/payments/authorizations/{authId}/void`         | 200, authorization `VOIDED`                                               |
| Void again                                               | same                                                     | 422 `PREVIOUSLY_VOIDED`                                                   |
| Capture after void                                       | capture on the voided authorization                      | 422 `AUTHORIZATION_VOIDED`                                                |
| Pay the winner $9 (reward minus 10%)                     | `POST /v1/payments/payouts`, `recipient_type: EMAIL`     | 201, batch `PENDING`, then `SUCCESS` within about 10 seconds              |
| Same `sender_batch_id` again                             | same                                                     | 400 "Batch with given sender_batch_id already exists"                     |

Payouts are enabled on the sandbox business account. The payout went to the sandbox buyer's email.

## Webhooks received and verified

All of these arrived at `/api/v1/webhooks/paypal` through ngrok and passed signature verification:

| Event                              | Fired when                                    |
| ---------------------------------- | --------------------------------------------- |
| `CHECKOUT.ORDER.APPROVED`          | Sponsor approved (one per order)              |
| `PAYMENT.AUTHORIZATION.CREATED`    | Our server authorized the order (one per order) |
| `PAYMENT.CAPTURE.COMPLETED`        | Capture of the winning bounty                 |
| `PAYMENT.AUTHORIZATION.VOIDED`     | Void of the expired bounty                    |
| `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`   | Winner's payout item paid                     |
| `PAYMENT.PAYOUTSBATCH.SUCCESS`     | Payout batch finished                         |

The sandbox webhook is now subscribed to these plus the payout failure events (`PAYMENT.PAYOUTSBATCH.DENIED`, `PAYMENT.PAYOUTS-ITEM.FAILED`, `PAYMENT.PAYOUTS-ITEM.UNCLAIMED`). The Render webhook needs the same list.

Note: `CHECKOUT.ORDER.APPROVED` fires for both donation orders (`intent: CAPTURE`) and bounty orders (`intent: AUTHORIZE`). The handler has to branch on `resource.intent`.

## Finding: PayPal's fee eats the commission

PayPal took a 0.99 USD fee on the 10.00 USD capture (`seller_receivable_breakdown.paypal_fee`), so Play2Pro received 9.01. Paying the winner 9.00 (reward minus 10%) leaves Play2Pro 0.01, before any payout fee. The demo works, but the business model doesn't as written. The team needs to decide, and say in the pitch, one of:

- the commission is taken after PayPal's fee, so the winner gets net minus 10%
- the sponsor pays the reward plus a fee on top
- a higher commission

Rabasa's payout maths should read `seller_receivable_breakdown.net_amount` from the capture response, not assume the gross amount.

## What the code needs (from these results)

| Function or job                  | Owner   | Notes from the test                                                                                                        |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `authorizeOrder()`               | Rabasa  | Two calls: create the order with `intent: AUTHORIZE` (sponsor approves), then `POST /orders/{id}/authorize` once `CHECKOUT.ORDER.APPROVED` arrives. Store the authorization ID and `expiration_time` on the Bounty. |
| `captureOrder(authorizationId)`  | Rabasa  | `{ final_capture: true }`. Treat 422 `AUTHORIZATION_ALREADY_CAPTURED` as "already done" and read the existing capture.      |
| `voidAuthorization(id)`          | Rabasa  | Treat 422 `PREVIOUSLY_VOIDED` as success.                                                                                  |
| `payout()`                       | Rabasa  | `sender_batch_id` derived from the submission or capture ID: PayPal rejects a repeat, which prevents double payouts.        |
| Expiry job                       | Obonyo  | Void before the deadline, and keep the deadline well inside the 29-day authorization window.                               |
| Escrow webhook handlers          | Rabasa  | `PAYMENT.AUTHORIZATION.CREATED` publishes the bounty. `PAYMENT.AUTHORIZATION.VOIDED` marks it expired. `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` or `.FAILED` confirms or reverses the BOUNTY wallet entry. |

## Escrow security checklist

Each line can become a test in Fabiola's suite.

- [ ] Creating a bounty and entering one both require `requireVerifiedAdult()`.
- [ ] Only the bounty's creator can confirm a winner (403 for anyone else).
- [ ] Confirm is idempotent: a double click must not capture twice. Check the bounty status inside a transaction before calling PayPal, and handle `AUTHORIZATION_ALREADY_CAPTURED`.
- [ ] The captured amount and currency equal the stored `rewardAmount` before any payout.
- [ ] The payout amount is computed on the server from stored values, never taken from the request.
- [ ] A bounty only goes live after a verified `PAYMENT.AUTHORIZATION.CREATED` webhook or a direct authorize response, never because the browser says so.
- [ ] The deadline is before the authorization's `expiration_time`. For the demo, keep it to hours.
- [ ] Expired bounties are voided, and a capture after a void fails (PayPal returns `AUTHORIZATION_VOIDED`).
- [ ] The payout `sender_batch_id` is unique per submission, so a retry can't pay twice.

## Sandbox objects from this run

| Object                            | ID                    |
| --------------------------------- | --------------------- |
| Order (captured)                  | `45X72537EA987663J`   |
| Capture                           | `54298010T8822700W`   |
| Order (voided)                    | `5NW87732DF989350N`   |
| Payout batch                      | `3CRLTJWTNP64C`       |

## References

- https://developer.paypal.com/docs/api/orders/v2/
- https://developer.paypal.com/api/rest/webhooks/rest/
