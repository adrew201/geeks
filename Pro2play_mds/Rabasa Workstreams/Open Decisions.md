---
type: decisions
owner: Rabasa
status: open
tags: [rabasa, decisions]
---

# Open Decisions

Contradictions found while organising the vault, and choices Rabasa needs the team to make. The recommendation is the default if nobody objects by the next 7 pm sync. Up: [[Rabasa Workstreams Index]] · [[Home]]

| # | Decision | Options | Recommendation | Who decides | Note |
| --- | --- | --- | --- | --- | --- |
| 1 | Role/tier model | `UserRole` with tier baked in (schema) vs. `role` + `tier` (plan) | `role` + `tier` | Rabasa + [[Obonyo]] | [[Schema Reconciliation]] |
| 2 | Money storage | `Decimal(12,2)` + mutable `Wallet.balance` vs. `Int` cents + append-only `WalletEntry` | Int cents + WalletEntry | Rabasa | [[Wallet Ledger & Payouts]] |
| 3 | `captureOrder` meaning | captures an authorization (README) vs. an order | Keep it for authorizations; add `captureDonationOrder` | Rabasa + [[Obonyo]] | [[Payments Service (PayPal)]] |
| 4 | Bounty payout path | direct `payout()` to the gamer vs. credit wallet then withdraw | Credit the wallet; the gamer withdraws | Rabasa + [[Obonyo]] | [[Wallet Ledger & Payouts]] |
| 5 | Currency | USD (README env) vs. **KSh** (all wireframes) | USD in sandbox; show KSh in the pitch only | Team | PayPal KES support is limited; confirm in PayPal docs |
| 6 | Wireframes show the **removed pay-to-unlock flow** | Update designs vs. reuse screens 13–16 for donations / bounty funding | Reuse the order → approve → pending → confirmed screens for **donation and bounty** flows | [[Nigel]] | [[Wireframes Index]] |
| 7 | Wireframe vote UI is 3-option (Impressive / Average / Needs Work) | 3-option vs. up/down swipe (spec + API) | Up/down (the API and Elo use it) | [[Nigel]] + [[Fabiola]] | |
| 8 | Default port | 4000 (`env.ts`) vs. 3000 (README, ngrok docs) | 3000 | Rabasa | [[Platform Skeleton & Config]] |
| 9 | Worker script name | `npm run worker` (README) vs. `start:worker` (package.json) | `start:worker`; fix the README | Rabasa | [[Render Deployment Runbook]] |
| 10 | Git flow | branch per feature + Rabasa merges (plan/README) vs. commit to `main` (repo instructions) | Commit to `main` (newest doc) | Team | [[CI & Repo Hygiene]] |
| 11 | Subscription prices | — | Paid Gamer $4.99, Coach $19.99 (placeholders) | Team | [[Subscriptions]] |
| 12 | Coach without an active subscription | Blocked vs. allowed | Allowed in the demo (seeded coach is PAID); gate later | Team | [[Subscriptions]] |
| 13 | Community membership fee | Free vs. paid via PayPal | Free (out of scope) | [[Obonyo]] (product lead) | [[Communities]] |
| 14 | Webhook replay fallback | Replay a real signed event vs. a dev-only simulate route | Decide with [[Gicharu]]; the simulate route must be off in production | Rabasa + Gicharu | [[Postman Collection]] |
| 15 | Architecture doc still mentions "one-tap unlock fees" and "coach unlocks footage" | — | Remove the unlock references from [[play2pro_architecture_tech_stack]] (plan §1 says to drop them) | Rabasa | Tech stack table, Zapier row, data-flow diagram |
