# Handoff: PayPal webhook verification and route guards

Owner: Gicharu. Reviewer: Rabasa. Branch: `gicharu/webhook-verification`. Date: 11 Nov 2026.

This file lists what was built, what has been tested, what the deployed demo still needs, and how to push. Design details are in [webhook-verification.md](webhook-verification.md). The day's log is in [gicharu-progress-2026-11-11.md](gicharu-progress-2026-11-11.md).

## What was built

| File                                    | What it does                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/plugins/webhooks/verify.ts`        | Checks the PayPal signature (SHA256, cert from `paypal-cert-url`, paypal.com hosts only)               |
| `src/plugins/webhooks/service.ts`       | `recordAndHandle()`: stores the event and runs its handler in one transaction, skips repeat event IDs  |
| `src/plugins/webhooks/index.ts`         | `POST /api/v1/webhooks/paypal`: raw body, verify, then dispatch to `makeHandlers(fees)`                |
| `src/plugins/webhooks/handlers.ts`      | Placeholder `makeHandlers(fees)` returning `{}`. Rabasa's version replaces it at merge                 |
| `src/middleware/guards.ts`              | `requireRole(...)`, `requireTier("PAID")`, `requireVerifiedAdult`, used as Fastify `preHandler`s       |
| `src/plugins/webhooks/webhooks.test.ts` | 17 tests                                                                                               |
| `src/middleware/guards.test.ts`         | 5 tests                                                                                                |
| `docs/webhook-verification.md`          | Design, request flow, handler contract                                                                 |
| `docs/gicharu-progress-2026-11-11.md`   | Day log, issues found, sandbox test results                                                            |
| `docs/gicharu-handoff.md`               | This file                                                                                              |

Not changed: the Prisma schema, migrations, `src/config/env.ts`, `src/plugins/payments/`, `package.json`, `package-lock.json`, `render.yaml`.

Using a guard:

```ts
import { requireRole, requireVerifiedAdult } from "../../middleware/guards.js";

app.post("/wallet/withdraw", { preHandler: [app.authenticate, requireVerifiedAdult] }, handler);
app.post("/communities", { preHandler: [app.authenticate, requireRole("COACH")] }, handler);
```

| Guard                  | Rejects with             | Reads                                    |
| ---------------------- | ------------------------ | ---------------------------------------- |
| `requireRole(...)`     | 403 `FORBIDDEN_ROLE`     | JWT role (role never changes)            |
| `requireTier("PAID")`  | 403 `FORBIDDEN_TIER`     | `User.tier` from the database            |
| `requireVerifiedAdult` | 403 `NOT_VERIFIED_ADULT` | `User.isVerifiedAdult` from the database |

## What succeeded

Automated checks:

| Check                                       | Result                                                              |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `npx vitest run`                            | 8 files, 53 tests pass                                              |
| `npx eslint src/plugins/webhooks src/middleware` | Clean                                                          |
| `npx tsc --noEmit`                          | No errors in these files. 3 errors in Obonyo's files (see below)    |
| Secret scan of changed files                | Nothing found                                                       |

Real PayPal sandbox test, run locally through ngrok:

| Step                                                                 | Result                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Sandbox credentials (OAuth token)                                    | 200                                                             |
| Created test product, plan ($9.99/month) and subscription, approved with a sandbox buyer | Subscription `I-P9E40KUTVGWS` is ACTIVE      |
| Real `BILLING.SUBSCRIPTION.ACTIVATED`, first delivery                | 500: cert download over 5s, nothing stored, PayPal retried      |
| PayPal's retry 35s later                                             | 200: verified with the real webhook ID, stored as IGNORED       |
| Exact replay                                                         | 200, treated as a duplicate, no new row                         |
| Edited body, altered signature, foreign cert host, swapped event ID  | All 400 `INVALID_SIGNATURE`, no rows                            |

PayPal's sandbox cert host is `api.sandbox.paypal.com`. One test row (`BILLING.SUBSCRIPTION.ACTIVATED`, status IGNORED) is kept in the shared `paypal_webhook_events` table as evidence of the test.

After the test, the cert download timeout was raised from 5s to 10s, so a slow first download no longer depends on PayPal's retry.

## What the deployed demo needs

"Live" here means the Render deploy. PayPal stays on sandbox. Never use live PayPal credentials.

| #   | Needed                                                                                                                   | Owner          | Blocks                          |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------- |
| 1   | Fix the `tsc` errors in `src/plugins/clips/service.ts`, `src/workers/enqueueTest.ts`, `src/workers/enqueueBountyTest.ts`. `npm run build` runs `tsc` | Obonyo         | The whole Render build          |
| 2   | Merge Rabasa's `makeHandlers(fees)` over the placeholder `handlers.ts`, matching the contract in webhook-verification.md | Rabasa         | Anything happening on an event (tier flip, wallet credit) |
| 3   | In the sandbox app, add a second webhook for `https://<render-url>/api/v1/webhooks/paypal`. Keep the ngrok one for local work | Gicharu        | Webhooks reaching Render        |
| 4   | Subscribe that webhook to: `BILLING.SUBSCRIPTION.*`, `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.AUTHORIZATION.CREATED`, `PAYMENT.AUTHORIZATION.VOIDED`, `PAYMENT.PAYOUTS-ITEM.*`. The current webhook has only `BILLING.*` | Gicharu        | Donation, bounty and payout events |
| 5   | Set `PAYPAL_WEBHOOK_ID` on Render to the new webhook's ID. Each webhook has its own ID, so the local one won't verify on Render | Rabasa (Render) | Verification on Render (500 without it) |
| 6   | Set on Render: `PAYPAL_PLAN_ID_PAID_GAMER`, `PAYPAL_PLAN_ID_COACH`, `DONATION_FEE_BPS`, `DONATION_FEE_BPS_PAID_GAMER`, `BOUNTY_COMMISSION_BPS`. None are in `render.yaml`. The fees fall back to 500, 250 and 1000 | Rabasa         | Subscriptions, correct fees     |
| 7   | Create the real Paid Gamer and Coach plans at the team's prices. The test plan above is $9.99 and for testing only | Rabasa         | Subscriptions                   |
| 8   | Apply the guards on money routes: withdraw, bounty create, bounty entry (`requireVerifiedAdult`); coach routes (`requireRole("COACH")`); paid analytics (`requireTier("PAID")`) | Rabasa, Obonyo | Security checklist              |
| 9   | Done: cert download timeout raised from 5s to 10s in `verify.ts`. Render's free tier still sleeps when idle, so see item 10 | Gicharu        | n/a                             |
| 10  | Wake the Render service shortly before the demo (open `/health`), so the first PayPal event isn't lost to a cold start | Whoever demos  | Demo smoothness                 |

Local `.env` fixes for anyone running it:

- `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`. The code reads this, not `PAYPAL_MODE`.
- `REDIS_URL`: a real value, or `redis://localhost:6379`. The template value crashes `npm run dev`.
- On Windows, run tests from `C:\...`, not `c:\...`.

## Commands to push

Check that the branch and changes are what you expect:

```sh
cd C:\projects\PayPal2.0\geeks
git status
git branch --show-current
```

You should be on `gicharu/webhook-verification`. `.env` must not appear in `git status`.

Commit and push:

```sh
git add src/plugins/webhooks/verify.ts src/plugins/webhooks/service.ts src/plugins/webhooks/index.ts src/plugins/webhooks/handlers.ts src/plugins/webhooks/webhooks.test.ts src/middleware/guards.ts src/middleware/guards.test.ts docs/webhook-verification.md docs/gicharu-progress-2026-11-11.md docs/gicharu-handoff.md
git commit -m "feat(webhooks): verify PayPal signatures, run handlers in the event transaction, add route guards"
git push -u origin gicharu/webhook-verification
```

Open the PR on GitHub against `main`. Only Rabasa merges.

- Title: `feat(webhooks): verify PayPal webhook signatures and add route guards`
- Body:

  ```
  This PR adds POST /api/v1/webhooks/paypal with PayPal signature verification, stores each event once and runs its handler in the same transaction, and adds requireRole, requireTier and requireVerifiedAdult guards.

  handlers.ts is a placeholder makeHandlers(fees) returning {}. Replace it with your version at merge; the contract is in docs/webhook-verification.md. What the Render deploy still needs is in docs/gicharu-handoff.md.
  ```

If `git status` shows `handlers.ts` as unchanged, or Rabasa's version has landed on `main` by then, run `git pull origin main` first and resolve `handlers.ts` in favour of Rabasa's file. Then line up the one call in `index.ts`: `makeHandlers(...)` and `handlers[event.event_type]`.

## References

- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developer.paypal.com/docs/api/webhooks/v1/
- https://nodejs.org/api/zlib.html
