# PayPal webhook verification

Author: Gicharu. Reviewer: Rabasa.

This change adds `POST /api/v1/webhooks/paypal`. The route checks every PayPal webhook signature before any handler runs. It then records each event once in `paypal_webhook_events` and passes it to the handler map in `handlers.ts`. It adds no schema changes, no migrations and no new dependencies.

## Files

| File                                    | Owner  | Change                                                                 |
| --------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `src/plugins/webhooks/verify.ts`        | Gicharu | Signature check, cert URL allowlist, in-memory cert cache             |
| `src/plugins/webhooks/service.ts`       | Gicharu | Records each event, detects duplicates, sets status                    |
| `src/plugins/webhooks/index.ts`         | Gicharu | Reads the raw body (this plugin only), the route, response codes       |
| `src/plugins/webhooks/handlers.ts`      | Rabasa | New file with an empty handler map. Rabasa fills it in                 |
| `src/plugins/webhooks/webhooks.test.ts` | Gicharu | 15 tests, no network or database                                       |

## Decisions to review

1. Self-verification, not postback. We check the signature ourselves, as PayPal describes in its webhooks doc: SHA256 over `transmissionId|transmissionTime|webhookId|crc32(raw body)`, using the cert at `paypal-cert-url`. This needs no PayPal access token. `payments/service.ts` can't get one yet. It also works for simulator events, which postback can't verify. `crc32` comes from `node:zlib`. Node's docs list it from 22.2. Render pins Node 22.
2. Cert URL allowlist. The cert URL must be `https` on `paypal.com` or a subdomain of it, and redirects are refused. Without this check, an attacker could point us at their own cert and sign anything.
3. Simulator events. PayPal signs simulator events with the literal webhook ID `WEBHOOK_ID`. We accept that ID only when `NODE_ENV !== "production"`. `render.yaml` sets `NODE_ENV=production`, so the deploy rejects simulator events. These events still carry a real PayPal signature, so this is not a bypass.
4. Unverified events are never stored. If they were, an attacker could claim a real event ID before PayPal's event arrived.
5. `handlers.ts` is Rabasa's file. I created it with an empty map so the route compiles. The route itself never imports PayPal or payments code.

## Request flow

| Step | Condition                                       | Response | Database                                  |
| ---- | ----------------------------------------------- | -------- | ----------------------------------------- |
| 1    | `PAYPAL_WEBHOOK_ID` not set                     | 500      | Nothing                                   |
| 2    | Empty or non-JSON content type                  | 400      | Nothing                                   |
| 3    | Cert fetch fails (PayPal retries)               | 500      | Nothing                                   |
| 4    | Bad signature, missing header, non-PayPal cert  | 400      | Nothing, logged with transmission ID      |
| 5    | Body isn't JSON or lacks `id` / `event_type`    | 400      | Nothing                                   |
| 6    | Event ID already PROCESSED, IGNORED or RECEIVED | 200      | Unchanged, handler not run                |
| 7    | No handler for `event_type`                     | 200      | Row with status IGNORED                   |
| 8    | Handler throws                                  | 500      | Status FAILED. PayPal's retry runs it again |
| 9    | Handler succeeds                                | 200      | Status PROCESSED                          |

A retry runs the handler again only if the stored status is FAILED. Flipping FAILED back to RECEIVED is a single `updateMany` statement, so two retries arriving at once can't both run the handler.

`status` is a free-text column. The new value `RECEIVED` fits without a migration. The route always writes `signatureValid: true` explicitly, so the column's default of `true` doesn't matter here.

## Handler contract for Rabasa

```ts
// src/plugins/webhooks/handlers.ts
import type { PaypalEvent } from "./service.js";
export type WebhookHandler = (event: PaypalEvent) => Promise<void>;
export const handlers: Partial<Record<string, WebhookHandler>> = {
  "BILLING.SUBSCRIPTION.ACTIVATED": async (event) => { /* Subscription ACTIVE, User.tier = PAID */ },
};
```

- Only verified events reach a handler, and the same event doesn't reach it twice unless the earlier attempt failed.
- Throw to make PayPal retry. Return normally once the work is done.
- `PaypalEvent` types only `id`, `event_type`, `resource_type`, `summary` and `resource`. Read anything else from `event.resource`.
- Handlers still need to be idempotent per resource. For example, two different events about the same capture must not credit twice. `WalletEntry`'s `@@unique([paypalRef, kind])` already covers wallet credits.

## Not covered

- An event stuck in RECEIVED is skipped on retry and never processed. That happens if the process dies after recording the event and before the handler finishes. A reconciliation job, or setting the status to FAILED by hand, would fix it. I left this out for the demo.
- The route doesn't reject events by transmission age. Duplicate detection handles replays, and PayPal doesn't document a retry window.
- PayPal's real cert host isn't confirmed yet. The tests use `api.sandbox.paypal.com`. If a real sandbox event is rejected with a cert error, check the `paypal-cert-url` header in the log.
- The cert cache lives in memory and is cleared on restart.

## How to test

1. Set `PAYPAL_WEBHOOK_ID` in `.env` to the webhook ID from the sandbox app.
2. Run `npm run dev` and point an ngrok tunnel at the API port.
3. In the sandbox app, register `https://<tunnel>/api/v1/webhooks/paypal` and subscribe to the events in README section 9.4.
4. Send a test event from the webhook simulator to the tunnel URL. The response should be 200, with a row in `paypal_webhook_events` (status IGNORED until a handler exists).
5. Send any of these and expect 400 with no row: an edited body, a different `paypal-transmission-sig`, or a `paypal-cert-url` on another host.
6. On Render, repeat step 4. A simulator event should get 400 there, because `NODE_ENV=production`.

## Verification

- `npx vitest run`: all 7 test files and 46 tests pass, including the 15 new ones.
- `npx eslint src/plugins/webhooks`: clean.
- `npx tsc --noEmit`: fails, but only in files outside this change: `src/plugins/clips/service.ts` (the vote direction type) and `src/workers/enqueueTest.ts` and `enqueueBountyTest.ts` (missing `passwordHash`). `npm run build` runs `tsc`, so these will also fail the Render build until fixed.
- On Windows, vitest fails every test file with `Cannot read properties of undefined (reading 'config')` if the shell's working directory uses a lowercase drive letter (`c:\`). Run it from `C:\...`.

## References

- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developer.paypal.com/docs/api/webhooks/v1/
- https://nodejs.org/api/zlib.html
