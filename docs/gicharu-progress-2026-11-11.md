# Gicharu: payment security progress, 11 Nov 2026

This file records everything done in the payment security area today: what was decided, what changed in the repo, what was verified, and what is still open. The code change itself is written up in detail in [webhook-verification.md](webhook-verification.md).

## Scope decisions

A proposal came in for a new `Wallet` and `Transaction` model, a `User.subscriptionStatus` field, and a `/api/subscriptions/verify` route that activates a subscription from the browser's `onApprove` callback. It was dropped for these reasons:

| Proposal                                        | Why it was dropped                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Wallet` and `Transaction` models               | `WalletEntry` is already the wallet ledger. A second one would mean two balances that can disagree.            |
| `User.subscriptionStatus`                       | Duplicates the existing `Subscription` model and `User.tier`                                                   |
| Setting `User.role` on subscribe                | Role never changes after signup. Subscribing changes `tier` only.                                              |
| Crediting the wallet on subscribe               | Subscription money goes to Play2Pro, not the gamer                                                             |
| `userId` and `amount` taken from the request    | Breaks "never trust the client". The user comes from the JWT, the amount from the stored plan.                 |
| Marking ACTIVE on `onApprove`                   | Not allowed without a verified webhook or a direct status check with PayPal                                    |
| `/api/...` paths and `src/routes/`              | The contract uses `/api/v1`, with one plugin per area                                                          |

Agreed instead: the subscription flow in README section 15.2. `POST /api/v1/subscriptions` (Rabasa) returns an approval link. `BILLING.SUBSCRIPTION.ACTIVATED` arrives through the verified webhook and sets `tier = PAID`. The plan buttons page belongs to Nigel in `web/`. None of this needs a schema change.

Gicharu's part was the webhook verification route.

## Code changes

| File                                    | Owner   | Change                                                                  |
| --------------------------------------- | ------- | ----------------------------------------------------------------------- |
| `src/plugins/webhooks/verify.ts`        | Gicharu | PayPal signature self-verification, cert URL allowlist, cert cache       |
| `src/plugins/webhooks/service.ts`       | Gicharu | Records each verified event once, re-runs FAILED events, sets status     |
| `src/plugins/webhooks/index.ts`         | Gicharu | `POST /api/v1/webhooks/paypal`, raw body in this plugin only             |
| `src/plugins/webhooks/handlers.ts`      | Rabasa  | New file with an empty handler map, for Rabasa to fill in                |
| `src/plugins/webhooks/webhooks.test.ts` | Gicharu | 15 tests                                                                 |
| `docs/webhook-verification.md`          | Gicharu | Review doc for Rabasa                                                    |
| `docs/gicharu-progress-2026-11-11.md`   | Gicharu | This file                                                                |

Not changed: the Prisma schema, migrations, `src/config/env.ts`, `src/plugins/payments/`, `package.json`, `package-lock.json`, `.env`.

Decisions made in the code, open to Rabasa's review:

- Self-verification instead of postback. It needs no PayPal access token and works with simulator events.
- Simulator events, which are signed with the webhook ID `WEBHOOK_ID`, are accepted only when `NODE_ENV !== "production"`.
- Events that fail verification are never stored, so a forged event can't claim a real event ID first.

## Verification so far

| Check                                            | Result                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `npx vitest run` (all tests)                     | 7 files, 46 tests pass, including the 15 new ones                                       |
| `npx eslint src/plugins/webhooks`                | Clean                                                                                   |
| `npx tsc --noEmit`                               | Fails, only in files outside this change (see below)                                    |
| Secret scan of changed files                     | Nothing found                                                                           |
| Local server, request with no signature          | 400 `INVALID_SIGNATURE`                                                                 |
| Local server, fake signature and non-PayPal cert | 400 `INVALID_SIGNATURE`                                                                 |
| Local server, JSON on other routes               | Still parsed normally                                                                   |
| Shared Supabase database                         | Reachable. `paypal_webhook_events` exists with 0 rows.                                  |

## Full test with the PayPal simulator: in progress

Done:

- The API is running locally on port 4000, because `.env` sets `PORT=4000`.
- `REDIS_URL` was overridden to `redis://localhost:6379` for this one process, because the value in `.env` is a template (see below). The webhook route doesn't use Redis.

Remaining:

1. Gicharu runs `ngrok http 4000`.
2. Gicharu sends `BILLING.SUBSCRIPTION.ACTIVATED` from the webhooks simulator to `https://<ngrok-url>/api/v1/webhooks/paypal`.
3. Expected result: 200, and one row in `paypal_webhook_events` with status `IGNORED`. It's `IGNORED` because no handler exists yet.
4. Replay the captured request from ngrok's inspector (`127.0.0.1:4040`) three ways:
   - Unchanged: expect it to be skipped as a duplicate.
   - With an edited body: expect 400 and no row.
   - With a non-PayPal cert URL: expect 400 and no row.
5. Delete the test rows from the shared database once the results are recorded.

## Issues found, not fixed

| Issue                                                                                   | Owner         | Impact                                                                    |
| --------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| `tsc` errors in `src/plugins/clips/service.ts` (the vote direction type)                | Obonyo        | `npm run build` runs `tsc`, so the Render build fails                     |
| `tsc` errors in `src/workers/enqueueTest.ts` and `enqueueBountyTest.ts` (missing `passwordHash`) | Obonyo        | Same                                                                      |
| `REDIS_URL` in `.env` is the template `redis://default:[PASSWORD]@[HOST]:6379`          | Gicharu       | `npm run dev` crashes on startup in `src/lib/queues.ts`                   |
| `DATABASE_URL` uses the Supabase pooler (port 6543)                                     | Gicharu       | `.env.example` recommends the direct connection (5432) for local work. Fine so far. |
| `PAYPAL_PLAN_ID_PAID_GAMER` and `PAYPAL_PLAN_ID_COACH` are empty                        | Rabasa        | Needed before the subscription endpoint can work                          |
| vitest fails every file when run from a lowercase `c:\` path                            | Everyone      | Run tests from `C:\...`                                                   |
| `PaypalWebhookEvent.signatureValid` defaults to `true`                                  | Rabasa        | The new route writes it explicitly, but the default is unsafe             |
| `authorizeOrder()` takes no `custom_id` or `PayPal-Request-Id`, and there's no order status lookup | Rabasa        | Bounty orders can't be traced or retried safely                           |
| `src/config/env.ts` doesn't fail if `PAYPAL_WEBHOOK_ID` is missing                      | Rabasa        | The webhook route returns 500 in that case, but README 8.3 asks for a startup failure |
| `docs/instructions.md` gives webhook and guard files different paths and owners from the README | Rabasa        | Unclear who owns `handlers.ts`                                            |
| agents.md isn't in the repo                                                             | Team          | A proposed rule about the vitest drive-letter issue couldn't be added     |

## Next steps

1. Finish the simulator test above.
2. Commit and open the PR from branch `gicharu/webhook-verification` for Rabasa to review.
3. Build the guards in `src/middleware/guards.ts`: `requireRole`, `requireTier` (which reads `tier` from the database), and `requireVerifiedAdult`, using the error codes in README section 18.
4. Rabasa adds the subscription handlers to `handlers.ts`. Obonyo and Rabasa apply the guards to the bounty and withdraw routes.

## References

- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developer.paypal.com/docs/api/webhooks/v1/
- https://nodejs.org/api/zlib.html
