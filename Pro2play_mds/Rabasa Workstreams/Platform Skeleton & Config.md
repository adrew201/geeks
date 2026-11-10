---
type: workstream
owner: Rabasa
day: Sat 7 Nov
status: in-progress
priority: P0
tags: [rabasa, fastify, config]
---

# Platform Skeleton & Config

Owns `src/server.ts`, `src/app.ts` (own block only), `src/config/`, `src/lib/prisma.ts`, `src/lib/errors.ts`, `src/types/`. Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §4, §6–8

## Current state (repo `origin/main` @ `51d70b6`)
- ✅ Fastify 5 app with one plugin per owner registered in `src/app.ts` (`/auth` prefix, everything else `/api/v1`)
- ✅ `npm` scripts: `dev`, `dev:worker`, `build`, `start`, `start:worker`, `db:*`, `lint`, `test` (vitest)
- ⚠ `src/config/env.ts` uses `process.env.X!` with **no validation**. A missing `PAYPAL_WEBHOOK_ID` would silently allow unverified webhooks (README §8.3 forbids this).
- ⚠ Port default is `4000` in code but `3000` in the README, `.env.example` and the webhook/ngrok docs. Pick one (recommended: **3000**) and fix the other.
- ⚠ `/health` returns `{ ok: true }`. The README promises `{"status":"ok","db":"ok","redis":"ok"}`.
- ❌ No `src/lib/errors.ts`, no shared error handler, no CORS registration (`@fastify/cors` is installed), no `@fastify/jwt` registration
- ❌ No `npm run typecheck` script (the README's pre-push command uses it)

## Tasks
- [ ] `src/config/env.ts`: parse with `zod` (add the dependency) or a hand-written `required()`; crash on boot listing **all** missing vars. Include fee BPS, plan IDs, `WEB_ORIGIN`, `APP_BASE_URL`, `PAYPAL_CURRENCY`, `RUN_WORKERS_IN_API`, and the feature flags.
- [ ] `src/lib/errors.ts`: `AppError(code, status, message)` plus a `setErrorHandler` mapping Fastify validation errors to `VALIDATION_ERROR` and unknown errors to 500 **without leaking stack traces**
- [ ] Register `@fastify/cors` with `origin: env.webOrigin`, and `@fastify/jwt` with `env.jwtSecret`
- [ ] `/health`: `SELECT 1` through Prisma and Redis `PING`; return 503 if either fails (Render health check)
- [ ] Keep the raw body available on the webhook route for [[Gicharu]] (e.g. a route-scoped `addContentTypeParser` with `parseAs: 'buffer'`)
- [ ] Add `"typecheck": "tsc --noEmit"` to `package.json`
- [ ] Add a logger redaction list: `req.headers.authorization`, `*.password`, `*.passwordHash`, and PayPal payer details (README §21)
- [ ] Graceful shutdown: `app.close()` + `prisma.$disconnect()` on SIGTERM (Render sends it on redeploy)

## Error format
One shape everywhere so [[Nigel]] can handle errors once:

```json
{ "error": { "code": "NOT_VERIFIED_ADULT", "message": "A verified adult PayPal account is required to withdraw." } }
```

| Code | HTTP |
| --- | --- |
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN_ROLE`, `FORBIDDEN_TIER`, `NOT_VERIFIED_ADULT` | 403 |
| `VALIDATION_ERROR` | 400 |
| `NOT_FOUND` | 404 |
| `CONFLICT` (duplicate join request, double confirm) | 409 *(proposed addition)* |
| `INSUFFICIENT_FUNDS` (withdraw > balance) | 422 *(proposed addition)* |
| `PAYPAL_ERROR` | 502 |

## Plugin shape (every owner follows it)
```text
src/plugins/<name>/
├── index.ts    # registers routes
├── routes.ts   # route defs + JSON schemas
├── service.ts  # business logic other plugins import
└── schemas.ts  # optional
```

## Done when
- `npm run dev` fails fast with a readable list when `.env` is incomplete
- `GET /health` reports DB and Redis status, and returns 503 when either is down
- Every error response matches the shape above

Related: [[Render Deployment Runbook]] · [[CI & Repo Hygiene]] · [[Auth, Roles & Tiers]]
