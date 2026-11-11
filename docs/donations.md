# Donations (push-to-pay)

Author: Gicharu. Reviewer: Rabasa. Branch: `gicharu/webhook-verification`. Date: 11 Nov 2026.

This is the donation flow from README section 15.1. A signed-in fan donates to a verified-adult gamer. PayPal holds the payment page. The gamer's wallet is credited only after PayPal reports the capture. Gicharu wrote it in Rabasa's folders with the team's go-ahead, because Rabasa's version wasn't on `main` yet. Decide at merge which version stays.

## Files

| File                                    | Owner  | Change                                                                                       |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `src/plugins/payments/service.ts`       | Rabasa | Real access token, `createOrder()`, `captureCheckoutOrder()`. Bounty functions still placeholders |
| `src/plugins/payments/donations.ts`     | Rabasa | New: `createDonation()`, `completeDonation()`, `failDonation()`, `getDonationOrder()`        |
| `src/plugins/payments/index.ts`         | Rabasa | `POST /api/v1/donations`, `GET /api/v1/orders/:id`                                           |
| `src/plugins/payments/donations.test.ts` | Rabasa | 16 tests                                                                                     |
| `src/plugins/webhooks/handlers.ts`      | Rabasa | `makeHandlers()` with the three donation event handlers                                      |
| `src/lib/prisma.ts`                     | Rabasa | Optional `DATABASE_SCHEMA` env var. Unset means `public`, so nothing changes by default      |

`service.ts` is still the only file that calls PayPal. `createOrder`'s placeholder signature `(amount, payeeId)` changed to an options object. Only donations use it. `captureOrder(authorizationId)` is left for bounties, and the donation capture is a separate function, `captureCheckoutOrder(orderId, requestId)`.

## API

These match what `web/src/features/payments/` already calls.

| Route                       | Auth          | Request                                     | Response                                                                 |
| --------------------------- | ------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/v1/donations`    | Any signed-in user | `{ gamerId, amount }`, amount in integer cents, 100 to 50000 | 201 `{ orderId, approvalUrl }`                                      |
| `GET /api/v1/orders/:id`    | Donor or recipient only | none                                  | `{ orderId, status, amount, purpose, gamerId, gamerTag, createdAt }`. `status` is PENDING, COMPLETED or FAILED |

`gamerId` can be the gamer's profile ID, which is what the web app sends, or their user ID.

| Error                       | When                                                       |
| --------------------------- | ---------------------------------------------------------- |
| 400 `VALIDATION_ERROR`      | Amount out of range or not whole cents, bad UUID           |
| 400 `CANNOT_DONATE_TO_SELF` | Donor is the recipient                                     |
| 401 `UNAUTHENTICATED`       | No token                                                   |
| 403 `NOT_VERIFIED_ADULT`    | The recipient isn't a verified adult                       |
| 404 `GAMER_NOT_FOUND`       | No gamer with that ID                                      |
| 404 `ORDER_NOT_FOUND`       | Unknown order, or the caller isn't the donor or recipient  |
| 502 `PAYPAL_UNAVAILABLE`    | PayPal didn't create the order. The donation is marked FAILED |

## Flow

1. `POST /donations` checks the recipient: exists, isn't the donor, `isVerifiedAdult`. The check is on the recipient, not the donor, so `requireVerifiedAdult` is deliberately not used here. It then works out the fee from the recipient's tier (`DONATION_FEE_BPS`, or `DONATION_FEE_BPS_PAID_GAMER` for paid gamers, rounded down) and saves a PENDING `Donation`. Finally it creates a PayPal order with intent `CAPTURE`, `custom_id = donationId` and `PayPal-Request-Id = donation-<id>`.
2. The payer approves on PayPal and comes back to `WEB_ORIGIN/pay/return?token=<orderId>`. Coming back proves nothing. The page reads the status from `GET /orders/:id`.
3. `CHECKOUT.ORDER.APPROVED` (verified webhook): the handler finds the donation by order ID, captures with `PayPal-Request-Id = capture-<donationId>`, and credits the wallet straight from PayPal's capture response if it's COMPLETED. "Already captured" counts as success. Orders with intent `AUTHORIZE` (bounties) and orders that aren't donations are skipped.
4. `PAYMENT.CAPTURE.COMPLETED` (verified webhook) runs the same credit step. If the donation is already COMPLETED, it does nothing.
5. The credit step, inside the webhook transaction:
   1. Checks the captured amount and currency against the stored donation. On a mismatch it marks the donation FAILED and logs an error, with no credit.
   2. Moves the donation from PENDING to COMPLETED in one conditional update, so only one caller can win.
   3. Writes `+amount DONATION` and `-fee FEE` wallet entries, both with `paypalRef = captureId`.
6. `PAYMENT.CAPTURE.DENIED` marks the donation FAILED.

The ledger follows README 15.1: a gross DONATION entry plus a negative FEE entry. The schema comment on `WalletEntryKind.DONATION` says the donation entry holds the net amount. The balance is the same either way. Update the comment, or the code, to match the team's choice.

## Sandbox test result

Run locally through ngrok against Gicharu's personal sandbox, using the `play2pro_test` schema (see "Database" below).

| Step                                                        | Result                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| `POST /donations`, $5 to a verified-adult test gamer        | 201. PayPal order `1CL65342XL498245R`, donation PENDING, fee 25, net 475 |
| Payer approved with a sandbox buyer account                 | PayPal order COMPLETED                                                  |
| `CHECKOUT.ORDER.APPROVED`, first delivery                   | Cert download timed out (10s), PayPal retried                           |
| Retry 9s later                                              | Verified, captured (`3MC088114S9653142`), donation COMPLETED, wallet credited |
| `PAYMENT.CAPTURE.COMPLETED`                                 | Verified, no second credit                                              |
| A second `CHECKOUT.ORDER.APPROVED` from PayPal (new event ID) | Verified, skipped, no second capture                                  |
| Wallet                                                      | Exactly 2 rows: `+500 DONATION`, `-25 FEE`                              |
| `GET /orders/1CL65342XL498245R` as the donor                | `status: COMPLETED`                                                     |

Automated: `npx vitest run` passes 9 files and 69 tests, 16 of them donation tests.

## Database

The `DATABASE_URL` in Gicharu's local `.env` points at a Supabase database built from the superseded `prisma/init.sql`. That file says "Do not run this file". The database has the old layout: `UserRole`, `adultKycVerified`, and `wallets` and `transactions` tables. It has no migration history and 0 users. The repo's Prisma code can't run on it.

For the test, the repo migrations were applied into a separate Postgres schema, `play2pro_test`, in that same database, and two test users were added there (`donor.test@play2pro.local`, `gamer.test@play2pro.local`, no usable password). The `public` schema was not touched. To run the app against it, set `DATABASE_SCHEMA=play2pro_test`.

`.env.example` is no longer in the repo after the latest pull, so `DATABASE_SCHEMA` isn't documented there. Add it when `.env.example` comes back.

## What the deployed demo still needs

| #   | Needed                                                                                                                         | Owner             |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1   | Retry the PayPal cert download once in `verify.ts`. The first event after a start or wake-up timed out twice in testing, at 5s and at 10s. PayPal's retry adds 10 to 35s | Gicharu           |
| 2   | Agree which donation code stays, this branch's or Rabasa's, and merge                                                          | Rabasa, Gicharu   |
| 3   | Fix the `tsc` errors in `src/plugins/clips/service.ts` and `src/workers/enqueue*.ts`, or the Render build fails               | Obonyo            |
| 4   | Render must use a database with the repo migrations applied (Render's Postgres runs `prisma migrate deploy` on start), not the old Supabase one | Rabasa            |
| 5   | A second sandbox webhook for `https://<render-url>/api/v1/webhooks/paypal`, with the same events as the local one (`BILLING.SUBSCRIPTION.*`, `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`), and its ID set as `PAYPAL_WEBHOOK_ID` on Render | Gicharu, Rabasa   |
| 6   | `WEB_ORIGIN` on Render set to the deployed web app, so PayPal returns payers there and not to `localhost:5173`                 | Rabasa            |
| 7   | A verified-adult gamer in the seed data to receive demo donations                                                              | Fabiola           |
| 8   | Decision: can minors receive donations? The code blocks them, per README section 18                                            | Team              |

Optional env vars and their defaults: `PAYPAL_API_BASE` (sandbox), `PAYPAL_CURRENCY` (USD), `WEB_ORIGIN` (`http://localhost:5173`), `DONATION_FEE_BPS` (500), `DONATION_FEE_BPS_PAID_GAMER` (250), `DATABASE_SCHEMA` (public).

## Known gaps

- If the payer cancels, the donation stays PENDING. Nothing expires it.
- The five unused-argument lint errors in `service.ts` are on the original bounty placeholder functions. They were there before this change.
- The test shows PayPal can send `CHECKOUT.ORDER.APPROVED` more than once with different event IDs. Handlers must stay idempotent per resource, not just per event.
