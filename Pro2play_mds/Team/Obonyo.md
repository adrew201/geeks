---
type: person
role: Product Lead & AI Engineer
tags: [team]
---

# Obonyo

**Owns:** AI agent, highlights, bounties, ads, coach matching. Folders: `src/plugins/clips`, `bounties`, `ads`, `coach`, `src/workers/` (incl. `prompts/`), `src/lib/redis.ts`, `src/lib/anthropic.ts`.
**Models:** Clip, Vote, Bounty, BountySubmission, AdImpression.

## Interfaces with [[Rabasa]]
- Calls `authorizeOrder()`, `captureOrder()`, `voidAuthorization()` and `payout()` from `src/plugins/payments/service.ts` and never calls PayPal directly. See [[Payments Service (PayPal)]].
- Workers write `aiSummary` and clip `tags`, `stats` and `aiQualityScore`, which [[Profiles & Dashboard API]] reads.
- Co-authored the Prisma schema with Rabasa (Saturday). See [[Schema Reconciliation]].
- Bounty webhook events (`PAYMENT.AUTHORIZATION.CREATED` / `.VOIDED`) are routed by [[Webhook Handlers]] to bounty logic.

Endpoints: `POST /api/v1/clips`, `GET /feed`, `POST /clips/:id/vote`, bounties CRUD/submissions/confirm, `GET /ads/next`, `GET /coach/matches`.
Back to [[Team Members]].
