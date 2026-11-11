# PayPal webhook verification

Author: Gicharu. Reviewer: Rabasa.

This change adds `POST /api/v1/webhooks/paypal`. The route checks every PayPal webhook signature before any handler runs. It then stores each event once in `paypal_webhook_events` and runs the event's handler from `makeHandlers(fees)` in the same database transaction. It also adds the route guards in `src/middleware/guards.ts`. It needs no schema changes, no migrations and no new dependencies.

## Files

| File                                    | Owner   | Change                                                                       |
| --------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `src/plugins/webhooks/verify.ts`        | Gicharu | Signature check, cert URL allowlist, in-memory cert cache                    |
| `src/plugins/webhooks/service.ts`       | Gicharu | `recordAndHandle()`: event insert and handler in one transaction             |
| `src/plugins/webhooks/index.ts`         | Gicharu | Raw body (this plugin only), the route, builds `fees` from env, response codes |
| `src/plugins/webhooks/handlers.ts`      | Rabasa  | Placeholder `makeHandlers(fees)` returning `{}`. Replace with Rabasa's at merge |
| `src/plugins/webhooks/webhooks.test.ts` | Gicharu | 17 tests, no network or database                                             |
| `src/middleware/guards.ts`              | Gicharu | `requireRole`, `requireTier`, `requireVerifiedAdult`                         |
| `src/middleware/guards.test.ts`         | Gicharu | 5 tests                                                                      |

## Decisions to review

1. Self-verification, not postback. We check the signature ourselves, as PayPal describes in its webhooks doc: SHA256 over `transmissionId|transmissionTime|webhookId|crc32(raw body)`, using the cert at `paypal-cert-url`. This needs no PayPal access token, and it works for simulator events, which postback can't verify. `crc32` comes from `node:zlib`.
2. Cert URL allowlist. The cert URL must be `https` on `paypal.com` or a subdomain of it, and redirects are refused. Without this, an attacker could point us at their own cert.
3. Simulator events, which are signed with the webhook ID `WEBHOOK_ID`, are accepted only when `NODE_ENV !== "production"`. Render sets `NODE_ENV=production`.
4. Unverified events are never stored. If they were, an attacker could claim a real event ID before PayPal's event arrived.
5. The handler runs inside the same transaction as the event insert, as Rabasa asked. The transaction timeout is 15 seconds, above Prisma's default of 5, to leave room for a PayPal call inside a handler.
6. The `makeHandlers` contract below is defined on our side, because Rabasa's version wasn't on `main` yet. Whatever Rabasa's version looks like, change `handlers.ts` and the one call in `index.ts` to match at merge time.

## Request flow

| Step | Condition                                          | Response | Database                                         |
| ---- | -------------------------------------------------- | -------- | ------------------------------------------------ |
| 1    | `PAYPAL_WEBHOOK_ID` not set                        | 500      | Nothing                                          |
| 2    | Empty or non-JSON content type                     | 400      | Nothing                                          |
| 3    | Cert fetch fails (PayPal retries)                  | 500      | Nothing                                          |
| 4    | Bad signature, missing header, non-PayPal cert     | 400      | Nothing, logged with transmission ID             |
| 5    | Body isn't JSON or lacks `id` / `event_type`       | 400      | Nothing                                          |
| 6    | Event ID already stored                            | 200      | Unchanged, handler not run                       |
| 7    | No handler for `event_type`                        | 200      | Row with status IGNORED                          |
| 8    | Handler throws                                     | 500      | Event row rolled back with the handler's writes  |
| 9    | Handler succeeds                                   | 200      | Row with status PROCESSED, plus the handler's writes |

Duplicates are caught by the unique index on `eventId`. If two deliveries of the same event arrive at once, the second insert waits for the first transaction. It then either sees the committed row (duplicate) or proceeds if the first rolled back.

A unique-constraint error thrown by a handler, for example from `WalletEntry`, counts as a handler failure (500), not as a duplicate event.

## Handler contract for Rabasa

```ts
// src/plugins/webhooks/handlers.ts
import type { Prisma } from "@prisma/client";
import type { PaypalEvent } from "./service.js";

export type Fees = { donationFeeBps: number; donationFeeBpsPaidGamer: number; bountyCommissionBps: number };
export type WebhookHandler = (tx: Prisma.TransactionClient, event: PaypalEvent) => Promise<void>;
export function makeHandlers(fees: Fees): Partial<Record<string, WebhookHandler>>;
```

- `index.ts` calls `makeHandlers` once at startup. `fees` comes from `DONATION_FEE_BPS`, `DONATION_FEE_BPS_PAID_GAMER` and `BOUNTY_COMMISSION_BPS`, defaulting to the `.env.example` values (500, 250, 1000).
- Write through `tx`, not the global `prisma`, so the writes roll back with the event row.
- Throw to make PayPal retry. Return normally once the work is done.
- Only verified events reach a handler, and the same event ID reaches it at most once successfully.
- Handlers still need to be idempotent per resource. For example, two different events about the same capture must not credit twice. `WalletEntry`'s `@@unique([paypalRef, kind])` covers wallet credits.

## Not covered

- Failed handler attempts aren't stored, because the event row rolls back with them. They show up only in the logs (`PayPal webhook handler failed`).
- A PayPal call inside a handler holds the database transaction open. Keep such calls short, or make them outside the handler.
- No rejection by transmission age. Duplicate detection covers replays.
- The cert cache lives in memory and is cleared on restart.

## How to test

1. Run `ngrok http 4000`, or whatever `PORT` is in `.env`.
2. In the sandbox app's webhook settings, the URL must include the full path: `https://<tunnel>/api/v1/webhooks/paypal`.
3. Simulator test: send `BILLING.SUBSCRIPTION.ACTIVATED` from the webhooks simulator. Expect 200 and a row with status IGNORED, until a handler exists.
4. Real sandbox test: create a subscription on a sandbox plan, approve it with a sandbox buyer account, and expect `BILLING.SUBSCRIPTION.CREATED` and `.ACTIVATED` to arrive signed with the real `PAYPAL_WEBHOOK_ID`.
5. Tampered body, bad signature or non-PayPal cert URL: expect 400 and no row.

## Verification

- `npx vitest run`: 8 test files, 53 tests pass, including 17 webhook tests and 5 guard tests.
- `npx eslint src/plugins/webhooks src/middleware`: clean.
- `npx tsc --noEmit`: fails only in files outside this change: `src/plugins/clips/service.ts`, `src/workers/enqueueTest.ts` and `src/workers/enqueueBountyTest.ts`. `npm run build` runs `tsc`, so these will also fail the Render build until fixed.
- On Windows, run vitest from `C:\...`. A lowercase `c:\` working directory makes every test file fail with "reading 'config'".

## References

- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developer.paypal.com/docs/api/webhooks/v1/
- https://nodejs.org/api/zlib.html
