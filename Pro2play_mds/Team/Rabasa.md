---
type: person
role: Backend, Platform, Payments, DevOps & Media
tags: [team, rabasa, backend]
---

# Rabasa

**Owns the platform and the money.** Fastify + TypeScript skeleton, Prisma schema, auth (roles + tiers), every PayPal call, the wallet ledger, Gamer ID / dashboard endpoints, coach communities, Render deployment, the Postman collection, CI and repo hygiene, the post-freeze gatekeeper role, and the demo video.

Back to [[Home]] · All workstreams: [[Rabasa Workstreams Index]] · Team: [[Team Members]]

## Ownership (union of plan, README and repo `docs/instructions.md`)

| Area | Files / folders | Detail note |
| --- | --- | --- |
| App skeleton, config, errors | `src/server.ts`, `src/app.ts` (own block), `src/config/`, `src/lib/prisma.ts`, `src/lib/errors.ts`, `src/types/` | [[Platform Skeleton & Config]] |
| Prisma models | `User`, `GamerProfile`, `WalletEntry`, `Subscription`, `Community`, `CommunityMember` + migrations | [[Schema Reconciliation]] |
| Auth | `src/plugins/auth/` | [[Auth, Roles & Tiers]] |
| PayPal (only client) | `src/plugins/payments/service.ts` | [[Payments Service (PayPal)]] |
| Wallet ledger + withdrawals | `src/plugins/payments/` | [[Wallet Ledger & Payouts]] |
| Subscriptions | `src/plugins/payments/` | [[Subscriptions]] |
| Webhook handlers (after Gicharu's verification) | `src/plugins/webhooks/handlers.ts` | [[Webhook Handlers]] |
| Gamer ID + dashboard | `src/plugins/profiles/` | [[Profiles & Dashboard API]] |
| Coach communities | `src/plugins/communities/` | [[Communities]] |
| Deploy, CI, repo hygiene | `render.yaml`, `.github/workflows/ci.yml`, `.gitattributes`, `.editorconfig`, `commitlint.config.js`, lockfile regen | [[Render Deployment Runbook]], [[CI & Repo Hygiene]] |
| API collection | `postman/Play2Pro.postman_collection.json` (exports once per evening) | [[Postman Collection]] |
| Payment tests | `tests/payments/` | [[Payments Service (PayPal)#Tests]] |
| Freeze gatekeeper + demo video | checks every fix after 9 pm Wed; tags `v1.0-submission` | [[Freeze, Demo Video & Submission]] |

## Status snapshot (repo `origin/main` @ `51d70b6`, checked 10 Nov)

> [!warning] Behind schedule
> As of that commit, every Rabasa-owned file is a **stub**. `payments/service.ts` throws `not implemented`; `auth/service.ts`, `profiles/service.ts`, `communities/service.ts` and `webhooks/handlers.ts` are empty. There is no `prisma/migrations/`, `render.yaml`, CI workflow, `errors.ts` or commitlint config. Saturday to Monday tasks are still open, so use the **triage order** in [[Rabasa Workstreams Index#Triage for Tue 10 + Wed 11 Nov]]. Re-check against the latest `main` before acting; teammates may have pushed since.

## Hand-offs (contracts others depend on)

- **[[Obonyo]] → Rabasa:** bounty code calls `authorizeOrder()`, `captureOrder()`, `voidAuthorization()` and `payout()`, and never calls PayPal directly. These are the most-blocking deliverables. See [[Payments Service (PayPal)]].
- **Rabasa → [[Obonyo]]:** profiles *read* `aiSummary`, clip `tags`, `stats` and `aiQualityScore` written by workers.
- **Rabasa → [[Fabiola]]:** call `recordVote()` and `recomputeRadScore(gamerId)`. Fabiola needs a migrated schema to write `prisma/seed.ts`.
- **[[Gicharu]] → Rabasa:** signature verification runs before `handlers.ts`, and guards wrap Rabasa's routes. See [[Webhook Handlers]].
- **Rabasa → [[Nigel]]:** response shapes live in the Postman collection. Tell Nigel the same evening if a shape changes.

## Original day-by-day checklist (from [[Play2Pro Implementation Plan (7–11 Nov)]])

### Sat 7 Nov: foundation
- [ ] Create the repo: Fastify + TypeScript, ESLint, `.env.example`, folder per plugin *(scaffold exists in repo)*
- [ ] Write the Prisma schema with [[Obonyo]] and run the first migration on local Postgres → [[Schema Reconciliation]]
- [ ] Auth: sign-up and login (JWT), `role` (GAMER, COACH, SPONSOR) and `tier` (FREE, PAID) on User → [[Auth, Roles & Tiers]]
- [ ] Create PayPal sandbox app; store client ID and secret; get an access token from Fastify → [[Payments Service (PayPal)]]

### Sun 8 Nov: core features
- [ ] Payments service: `createOrder()` (CAPTURE) for donations, `authorizeOrder()`, `captureOrder()`, `voidAuthorization()` for bounties
- [ ] `POST /api/v1/donations`: create order, return approval link (push-to-pay)
- [ ] Wallet ledger table: every credit and debit written in one transaction → [[Wallet Ledger & Payouts]]
- [ ] Subscriptions: Paid Gamer and Coach plans in sandbox; `POST /api/v1/subscriptions`; flip `tier` to PAID on webhook → [[Subscriptions]]
- [ ] Postman collection with sandbox environment shared with the team → [[Postman Collection]]

### Mon 9 Nov: money and profiles
- [ ] `payout()` via Payouts API and `POST /api/v1/wallet/withdraw`
- [ ] `GET /api/v1/gamers/:id` and `GET /api/v1/gamers/:id/dashboard` → [[Profiles & Dashboard API]]

### Tue 10 Nov: communities and deploy
- [ ] Communities: create, request to join, approve or decline, members' dashboards for the coach → [[Communities]]
- [ ] Deploy to Render: web service, managed Postgres, Redis, worker; run migrations and seed → [[Render Deployment Runbook]]
- [ ] Point PayPal sandbox webhooks at the Render URL

### Wed 11 Nov: freeze
- [ ] Gatekeep fixes after the 9 pm freeze; tag `v1.0-submission`
- [ ] Record the demo video against the deployed app → [[Freeze, Demo Video & Submission]]

## Sync points Rabasa must attend
- Sun evening, with Obonyo and Gicharu: first full donation through the webhook
- Mon to Wed, 7 pm: 10-minute blocker check
- Mon to Wed, 11 pm: push to `main`; Render redeploys

Related: [[Open Decisions]] · [[Wireframes Index]] · [[chainforge-commit-sop]]
