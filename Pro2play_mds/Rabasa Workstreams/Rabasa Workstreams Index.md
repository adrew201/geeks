---
type: moc
owner: Rabasa
tags: [rabasa, workstreams]
---

# Rabasa Workstreams Index

Detailed development responsibilities for [[Rabasa]]. Each note has a **contract**, **tasks**, **acceptance criteria (done when)**, **edge cases** and **links**. The table view is in `Rabasa Workstreams.base`, and the dependency map is in `Rabasa Work Map.canvas`.

Back to [[Home]] · [[Team Members]]

## Workstreams

| # | Workstream | Plan day | Blocks | Demo-critical |
| --- | --- | --- | --- | --- |
| 1 | [[Schema Reconciliation]] (Prisma models + first migration) | Sat | Everyone, seed, every endpoint | ✅ |
| 2 | [[Platform Skeleton & Config]] (config, errors, health, plugin shape) | Sat | All plugins | ✅ |
| 3 | [[Auth, Roles & Tiers]] | Sat | Guards (Gicharu), every authed route, Nigel's login | ✅ |
| 4 | [[Payments Service (PayPal)]] | Sat–Sun | Obonyo's bounties, donations, withdraw | ✅ |
| 5 | [[Webhook Handlers]] | Sun | Wallet credits, tier flips, payout status | ✅ |
| 6 | [[Wallet Ledger & Payouts]] | Sun–Mon | Donations, bounty payouts, withdraw | ✅ |
| 7 | [[Subscriptions]] | Sun | Paid tier, ads hidden | ✅ |
| 8 | [[Profiles & Dashboard API]] | Mon | Gamer ID UI, AG Charts dashboards | ✅ |
| 9 | [[Communities]] | Tue | Coach demo step | ◑ (create + join + approve only) |
| 10 | [[Render Deployment Runbook]] | Tue | QA on deployed URL, demo video | ✅ |
| 11 | [[CI & Repo Hygiene]] | ongoing | Cross-platform team commits | ◑ |
| 12 | [[Postman Collection]] | Sun, nightly | Nigel's mocks, Fabiola's tests | ✅ |
| 13 | [[Freeze, Demo Video & Submission]] | Wed | Submission | ✅ |

Cross-cutting: [[Open Decisions]] · [[Wireframes Index]]

## Triage for Tue 10 + Wed 11 Nov

> [!important] Why this order
> The repo snapshot (`origin/main` @ `51d70b6`) shows Rabasa's plugins as stubs, so the plan's day-by-day order no longer fits. This order unblocks teammates first, then the demo-critical money flows. **Deploy early** so Render problems show up on Tuesday, not Wednesday. Re-check `main` first in case some of this has already landed.

**Tue evening (7–11 pm)**
1. [[Schema Reconciliation]]: resolve role/tier, cents vs. Decimal and WalletEntry vs. Wallet; run `npx prisma migrate dev --name init` and push immediately (unblocks Fabiola's seed and Obonyo's models). *~45 min*
2. [[Platform Skeleton & Config]]: env validation, `errors.ts`, `/health` with DB + Redis. *~20 min*
3. [[Render Deployment Runbook]]: deploy the skeleton now (API + DB + Key Value + worker or `RUN_WORKERS_IN_API`). *~40 min*
4. [[Auth, Roles & Tiers]]: signup/login/JWT. *~40 min*
5. [[Payments Service (PayPal)]]: token cache, then `authorizeOrder`, `captureOrder`, `voidAuthorization` and `payout` first (Obonyo is blocked on these), then `createOrder` + capture for donations. *~90 min*

**Wed (before the 7 pm bug-fix window if possible; otherwise 7–9 pm)**
6. [[Webhook Handlers]] + [[Wallet Ledger & Payouts]]: credit on `PAYMENT.CAPTURE.COMPLETED`, withdraw, payout status.
7. [[Subscriptions]]: two sandbox plans, `POST /subscriptions`, tier flip on webhook.
8. [[Profiles & Dashboard API]]: `GET /gamers/:id` and `/dashboard`.
9. [[Communities]]: create, join and approve only. Cut the side-by-side member dashboards if time runs out (cut list #3).
10. [[Postman Collection]] export, PayPal webhook URL pointed at Render, then the 9 pm freeze → [[Freeze, Demo Video & Submission]].

**If behind, Rabasa's own cut order:** community member dashboards → dashboard extras beyond `radScore` history → withdraw UI polish. Payments and bounties are never cut (plan §6).
