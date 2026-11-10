# Play2Pro

> Turning casual gamers into professionals. Team Quest · PayPal Hackathon · Nov 2026

Play2Pro turns scattered gameplay clips into a verified, ranked **Gamer ID** that coaches and sponsors trust, and pays gamers for it through PayPal. **The gamer is the product. Coaches and sponsors are the customers.**

This README is for **teammates setting up and working in the repo**. It covers local setup, environment variables, PayPal sandbox configuration, how the services fit together, who owns what, how money moves, and how we deploy to Render.

> **Deadline:** code freeze **Wed 11 Nov, 9 pm**. Submit before midnight. If something in this README disagrees with the implementation plan, the plan wins; fix the README in the same PR.

---

## Table of contents

1. [What we're building (demo scope)](#1-what-were-building-demo-scope)
2. [Team and ownership](#2-team-and-ownership)
3. [Tech stack](#3-tech-stack)
4. [Repository layout](#4-repository-layout)
5. [Prerequisites](#5-prerequisites)
6. [Quick start (TL;DR)](#6-quick-start-tldr)
7. [Detailed local setup](#7-detailed-local-setup)
8. [Environment variables](#8-environment-variables)
9. [PayPal sandbox setup](#9-paypal-sandbox-setup)
10. [Claude (AI agent) setup](#10-claude-ai-agent-setup)
11. [Running the app](#11-running-the-app)
12. [Architecture](#12-architecture)
13. [Data model](#13-data-model)
14. [API reference](#14-api-reference)
15. [Money flows](#15-money-flows)
16. [Ranking engine (Elo + rad score)](#16-ranking-engine-elo--rad-score)
17. [Background jobs (BullMQ)](#17-background-jobs-bullmq)
18. [Auth, roles, tiers and guards](#18-auth-roles-tiers-and-guards)
19. [Ads](#19-ads)
20. [Testing](#20-testing)
21. [Git workflow and conventions](#21-git-workflow-and-conventions)
22. [Deploying to Render](#22-deploying-to-render)
23. [Demo-ready checklist](#23-demo-ready-checklist)
24. [Troubleshooting](#24-troubleshooting)
25. [Scope: cut list and out of scope](#25-scope-cut-list-and-out-of-scope)
26. [Glossary](#26-glossary)

---

## 1. What we're building (demo scope)

These features **must ship**. The demo depends on them.

| Feature | Minimum for the demo |
| --- | --- |
| User tiers | Sign-up as Gamer / Coach / Sponsor; paid tier via PayPal Subscriptions (sandbox) |
| Highlights | Upload clip link, swipe up/down, Elo + rad score, live leaderboard |
| Donations | One-tap push-to-pay donation into the gamer wallet |
| Bounty | Create with authorize, submit clip, AI check, capture + payout |
| Gamer profile | Gamer ID + dashboard (AG Grid / AG Charts); coach can view |
| AI agent | Clip tagging + skill summary via BullMQ worker |
| Ads | House feed ad for free users, hidden for paid users |

**Removed from scope:** coaches paying to unlock long-form footage. Coach access to gamer profiles is included in the Coach tier. If you see "unlock fee" anywhere in old docs or code, it's dead; don't build it.

---

## 2. Team and ownership

Each backend owner works in **their own Fastify plugin folder**, so we rarely touch the same files. **Don't edit another owner's folder without asking first.**

| Person | Owns | Folders | Key deliverables |
| --- | --- | --- | --- |
| **Rabasa** | Platform foundation, payments, profiles, communities, deployment | `src/plugins/auth`, `src/plugins/payments`, `src/plugins/profiles`, `src/plugins/communities`, `prisma/` | Fastify + TS skeleton, Prisma schema + migrations, auth with roles/tiers, PayPal Orders/Subscriptions/Payouts + wallet ledger, Gamer ID + dashboard endpoints, communities CRUD, Render deploy, Postman collection, demo video |
| **Obonyo** | AI agent, highlights, bounties, ads | `src/plugins/clips`, `src/plugins/bounties`, `src/plugins/ads`, `src/workers/` | Redis + BullMQ, Claude worker (tagging, skill summary, bounty verification), clip upload/feed/vote endpoints, bounty lifecycle, ad selection, coach talent matching |
| **Fabiola** | Ranking engine, seed data, QA, submission | `src/lib/ranking/`, `prisma/seed.ts`, `postman/tests/` | Elo + rad score as pure tested functions, leaderboard query, seed script, Postman test runs, end-to-end QA, submission answers |
| **Gicharu** | Payment security | `src/plugins/webhooks`, `src/middleware/` (auth guards) | PayPal webhook signature verification, role/tier guards, adult-account check before payouts and bounty entry, security pass on payment routes |
| **Nigel** | Frontend | `web/` | Swipe feed, Gamer ID, push-to-pay prompt, bounty screens, AG Grid / AG Charts dashboards for gamer, coach and sponsor |

### Hand-off contracts between owners

- **Obonyo → Rabasa (money):** bounty code never calls PayPal directly. It calls these functions from `src/plugins/payments/service.ts`:
  - `authorizeOrder(...)`
  - `captureOrder(...)` (captures an authorization)
  - `voidAuthorization(...)`
  - `payout(...)`
- **Rabasa → Obonyo (AI outputs):** the worker writes AI skill summaries and clip tags into the database. Profile endpoints only **read** them.
- **Both → Fabiola (ranking):** after a vote or a completed bounty, call `recordVote()` and `recomputeRadScore(gamerId)` from `src/lib/ranking`.
- **Gicharu → everyone:** webhook verification runs **before** any webhook handler. Guards are applied per route (see [section 18](#18-auth-roles-tiers-and-guards)).

---

## 3. Tech stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend | React, Vite, Tailwind CSS | Mobile-first swipe UI |
| Dashboards | AG Grid React, AG Charts | Gamer, coach and sponsor dashboards (AG Grid partner prize) |
| Backend API | Node.js, TypeScript, Fastify | One plugin per domain |
| Database | PostgreSQL + Prisma ORM | Migrations in `prisma/migrations` |
| Queue / jobs | Redis + BullMQ | Separate worker process |
| AI | Claude (vision-capable model) via Anthropic API | Runs only inside workers, never in a request handler |
| Payments | PayPal: Orders, Subscriptions, Payouts, Webhooks | Sandbox only for the hackathon |
| API testing | Postman (+ Newman for CLI runs) | Shared collection + sandbox environment |
| Hosting | Render: web service, background worker, Postgres, Redis (Key Value) | Render partner prize |
| Notifications (stretch) | Zapier MCP → WhatsApp | First thing we cut; fallback is in-app notifications |

---

## 4. Repository layout

Proposed layout. Keep to it so ownership stays clean.

```text
play2pro/
├── README.md
├── .env.example                  # every backend env var, no secrets
├── docker-compose.yml            # local Postgres + Redis
├── package.json                  # backend scripts
├── tsconfig.json
├── .eslintrc.cjs
├── prisma/                       # Rabasa (schema), Fabiola (seed.ts)
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── server.ts                 # builds the Fastify app, registers plugins
│   ├── index.ts                  # starts the HTTP server
│   ├── config.ts                 # reads and validates env vars
│   ├── lib/
│   │   ├── prisma.ts             # shared Prisma client
│   │   ├── redis.ts              # shared Redis connection
│   │   ├── queues.ts             # BullMQ queue definitions
│   │   └── ranking/              # Fabiola: Elo, rad score, leaderboard
│   │       ├── elo.ts
│   │       ├── radScore.ts
│   │       ├── leaderboard.ts
│   │       └── __tests__/
│   ├── middleware/               # Gicharu: requireAuth, requireRole, requireTier, requireAdult
│   ├── plugins/
│   │   ├── auth/                 # Rabasa
│   │   ├── payments/             # Rabasa (service.ts is the ONLY PayPal client)
│   │   ├── profiles/             # Rabasa
│   │   ├── communities/          # Rabasa
│   │   ├── webhooks/             # Gicharu (verify) + Rabasa (handlers)
│   │   ├── clips/                # Obonyo
│   │   ├── bounties/             # Obonyo
│   │   └── ads/                  # Obonyo
│   └── workers/                  # Obonyo
│       ├── index.ts              # starts all BullMQ workers
│       ├── clipAnalysis.ts
│       ├── skillSummary.ts
│       ├── bountyVerification.ts
│       ├── bountyExpiry.ts
│       └── prompts/              # Claude prompt templates
├── postman/                      # Rabasa (collection), Fabiola (tests)
│   ├── Play2Pro.postman_collection.json
│   ├── sandbox.postman_environment.json
│   └── tests/
└── web/                          # Nigel
    ├── package.json
    ├── .env.example
    ├── index.html
    └── src/
```

Each plugin folder follows the same shape:

```text
src/plugins/<name>/
├── index.ts      # Fastify plugin: registers routes
├── routes.ts     # route definitions + JSON schemas
├── service.ts    # business logic (what other plugins import)
└── schemas.ts    # request/response schemas (optional)
```

---

## 5. Prerequisites

Install these before Saturday's session.

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20 LTS or newer | Runtime for API, worker and Vite |
| npm | comes with Node | Package manager (don't mix in yarn/pnpm lockfiles) |
| Docker Desktop | recent | Runs local Postgres and Redis |
| Git | recent | — |
| Postman | desktop app | Shared collection and sandbox environment |
| A tunnel tool | `ngrok` or `cloudflared` | Only needed if you test PayPal webhooks against your laptop |

Accounts you need access to (ask Rabasa if you're missing one):

- **PayPal Developer** sandbox app (client ID + secret are shared via the team's secret channel, never in Git)
- **Anthropic API key** (for whoever runs the worker locally)
- **Render** team (Rabasa adds people)
- **Postman** team workspace

No Docker? Install Postgres 15+ and Redis 7+ natively and set `DATABASE_URL` / `REDIS_URL` to match.

---

## 6. Quick start (TL;DR)

```bash
git clone <repo-url> play2pro && cd play2pro
npm install
cp .env.example .env              # then fill in secrets (section 8)
docker compose up -d              # Postgres + Redis
npx prisma migrate dev            # create tables
npm run db:seed                   # demo gamers, coaches, sponsor, clips
npm run dev                       # API on http://localhost:3000
npm run worker:dev                # in a second terminal: BullMQ workers

cd web && npm install && cp .env.example .env && npm run dev   # third terminal: frontend on :5173
```

Check it's alive:

```bash
curl http://localhost:3000/health
# {"status":"ok","db":"ok","redis":"ok"}
```

---

## 7. Detailed local setup

### 7.1 Clone and install

```bash
git clone <repo-url> play2pro
cd play2pro
npm install
```

### 7.2 Start Postgres and Redis

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: play2pro
      POSTGRES_PASSWORD: play2pro
      POSTGRES_DB: play2pro
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
docker compose up -d
docker compose ps        # both should be "running"
```

### 7.3 Configure environment

```bash
cp .env.example .env
```

Fill in the values described in [section 8](#8-environment-variables). Local defaults for the database and Redis already match `docker-compose.yml`.

### 7.4 Database

```bash
npx prisma migrate dev     # applies migrations, generates the Prisma client
npm run db:seed            # 15 gamers, 2 coaches, 1 sponsor, 40 clips with votes
npx prisma studio          # optional: browse data at http://localhost:5555
```

Reset everything (drops data, re-migrates, re-seeds):

```bash
npx prisma migrate reset
```

**Schema rule:** after Saturday, only a model's owner changes that model (see [section 13](#13-data-model)). If you need a field on someone else's model, ask them; they make the migration.

### 7.5 Frontend

```bash
cd web
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

While the backend fills in, Nigel can point `VITE_API_URL` at the Postman mock server URL instead of `localhost:3000`.

### 7.6 Suggested npm scripts

Root `package.json` (adjust if the repo already differs, then update this table):

| Script | Command | What it does |
| --- | --- | --- |
| `dev` | `tsx watch src/index.ts` | API with hot reload |
| `worker:dev` | `tsx watch src/workers/index.ts` | Workers with hot reload |
| `build` | `tsc -p tsconfig.json` | Compile to `dist/` |
| `start` | `node dist/index.js` | Production API |
| `worker` | `node dist/workers/index.js` | Production workers |
| `db:migrate` | `prisma migrate deploy` | Apply migrations (prod/Render) |
| `db:seed` | `tsx prisma/seed.ts` | Seed demo data |
| `test` | `vitest run` | Unit tests (ranking etc.) |
| `test:api` | `newman run postman/Play2Pro.postman_collection.json -e postman/sandbox.postman_environment.json` | Postman tests from CLI |
| `lint` | `eslint "src/**/*.ts"` | Lint |
| `typecheck` | `tsc --noEmit` | Type-check only |

---

## 8. Environment variables

**Never commit `.env`.** Keep `.env.example` up to date: if you add a variable, add it there in the same PR with a placeholder value.

### 8.1 Backend (`.env`)

```bash
# --- Server ---
NODE_ENV=development
PORT=3000
APP_BASE_URL=http://localhost:3000        # public URL of the API (Render URL in prod)
WEB_ORIGIN=http://localhost:5173          # CORS + PayPal return/cancel URLs
LOG_LEVEL=info

# --- Database & Redis ---
DATABASE_URL=postgresql://play2pro:play2pro@localhost:5432/play2pro
REDIS_URL=redis://localhost:6379

# --- Auth ---
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d

# --- PayPal (sandbox) ---
PAYPAL_ENV=sandbox
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=                        # from the sandbox app's webhook settings
PAYPAL_PLAN_ID_PAID_GAMER=                # P-xxxx from Subscriptions
PAYPAL_PLAN_ID_COACH=                     # P-xxxx from Subscriptions
PAYPAL_CURRENCY=USD

# --- Platform fees (basis points: 100 = 1%) ---
DONATION_FEE_BPS=500
DONATION_FEE_BPS_PAID_GAMER=250
BOUNTY_COMMISSION_BPS=1000

# --- Claude ---
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-5-5
CLAUDE_MAX_TOKENS=1500

# --- Ads ---
ADS_PER_SESSION_CAP=3
ADS_EVERY_N_CLIPS=5

# --- Feature flags (flip off to follow the cut list) ---
FEATURE_ZAPIER_NOTIFICATIONS=false
FEATURE_SPONSOR_CAMPAIGNS=false
FEATURE_TRUST_SAFETY=false

# --- Zapier MCP (stretch) ---
ZAPIER_WEBHOOK_URL=
```

Fee values are placeholders until the team agrees them; change them here, not in code.

### 8.2 Frontend (`web/.env`)

```bash
VITE_API_URL=http://localhost:3000
VITE_PAYPAL_CLIENT_ID=                    # same sandbox client ID; public, safe in the browser
```

Only variables prefixed `VITE_` reach the browser. **Never** put the PayPal secret, JWT secret or Anthropic key in `web/.env`.

### 8.3 Validate config at startup

`src/config.ts` should parse `process.env` (e.g. with `zod` or `envalid`) and crash on startup with a clear message if a required variable is missing. A missing `PAYPAL_WEBHOOK_ID` should fail loudly, not silently accept unverified webhooks.

---

## 9. PayPal sandbox setup

Do this **on Saturday**. Payouts in particular needs sandbox accounts set up early.

### 9.1 Create the sandbox app

1. Log in at the PayPal Developer Dashboard and switch to **Sandbox**.
2. **Apps & Credentials → Create App** (merchant type). Name it `play2pro-sandbox`.
3. Copy **Client ID** and **Secret** into the team secret channel and your `.env`.
4. In the app's features, make sure **Payouts** and **Subscriptions** (billing) are enabled.

### 9.2 Sandbox accounts

Under **Testing Tools → Sandbox Accounts**, create:

| Account | Type | Used for |
| --- | --- | --- |
| `play2pro-platform` | Business | The platform (receives payments, sends payouts) |
| `sponsor-demo` | Personal | Funds bounties, buys campaigns |
| `fan-demo` | Personal | Donates to gamers |
| `coach-demo` | Personal | Coach subscription |
| `gamer-demo-1`, `gamer-demo-2` | Personal | Paid Gamer subscription, receives payouts |

Put the sandbox emails/passwords in the shared Postman environment (not in Git). Make sure the business account has sandbox balance so payouts succeed.

### 9.3 Create subscription plans

Create one **Product** ("Play2Pro") and two **Plans** (Rabasa owns this). Either through the dashboard or with Postman calls to `POST /v1/catalogs/products` then `POST /v1/billing/plans`:

| Plan | Env var | Billing |
| --- | --- | --- |
| Paid Gamer | `PAYPAL_PLAN_ID_PAID_GAMER` | Monthly |
| Coach | `PAYPAL_PLAN_ID_COACH` | Monthly |

Prices are a team decision; the plan IDs are what the code needs.

### 9.4 Webhooks

In the sandbox app, **Add Webhook** with URL:

- Local: `https://<your-tunnel>/api/v1/webhooks/paypal`
- Deployed: `https://<render-url>/api/v1/webhooks/paypal` (Tuesday)

Copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`. Subscribe to at least:

| Event | Handled by | Effect |
| --- | --- | --- |
| `CHECKOUT.ORDER.APPROVED` | payments | Payer approved; capture (donation) or authorize (bounty) |
| `PAYMENT.CAPTURE.COMPLETED` | payments | Credit the gamer wallet (donation) / finalise bounty capture |
| `PAYMENT.AUTHORIZATION.CREATED` | payments + bounties | Bounty funds held → publish bounty |
| `PAYMENT.AUTHORIZATION.VOIDED` | bounties | Bounty expired/cancelled |
| `BILLING.SUBSCRIPTION.ACTIVATED` | payments + auth | Set `tier = PAID` |
| `BILLING.SUBSCRIPTION.CANCELLED` / `.EXPIRED` / `.SUSPENDED` | payments + auth | Set `tier = FREE` |
| `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` | payments | Mark withdrawal/payout as paid |
| `PAYMENT.PAYOUTS-ITEM.FAILED` (and other non-success item events) | payments | Reverse the wallet debit |

**Webhook pipeline (Gicharu):**

1. Receive raw request; keep the **raw body** (don't let a parser reformat it before verification).
2. Call PayPal's `POST /v1/notifications/verify-webhook-signature` with the `paypal-transmission-*` headers, `auth_algo`, `cert_url`, `PAYPAL_WEBHOOK_ID` and the event.
3. If `verification_status !== "SUCCESS"`, return `400` and log. **No handler runs.**
4. Store the event ID; if we've seen it before, return `200` and do nothing (PayPal retries; handlers must be idempotent).
5. Dispatch to the right handler by `event_type`.
6. Return `200` quickly. Heavy work goes on a queue.

**Local webhook testing:**

```bash
ngrok http 3000
# copy the https URL into a sandbox webhook (create a separate "local" webhook per dev if needed)
```

Use the dashboard's **Webhooks simulator** to fire sample events. Note simulated events aren't tied to real orders, so they're good for checking verification and routing, not for full flows.

**Demo fallback:** Postman request "Simulate webhook" that replays a signed sample event, plus polling order status (`GET /v2/checkout/orders/:id`) if webhooks are slow during the demo.

### 9.5 Authorization time limits (bounties)

A PayPal authorization doesn't last forever. As far as we know: an authorization is valid for **29 days**, with a **3-day honor period** in which capture is guaranteed; after that, capture can fail. **Confirm against PayPal's current docs.** For the demo, bounties use **short deadlines (hours)** so this never bites. In code, reject bounty deadlines beyond our configured cap.

### 9.6 Get an access token (sanity check)

```bash
curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  "$PAYPAL_API_BASE/v1/oauth2/token"
```

`payments/service.ts` caches the token in memory until shortly before `expires_in` and refreshes on `401`.

---

## 10. Claude (AI agent) setup

1. Put your key in `ANTHROPIC_API_KEY`. The key lives **only** on the backend/worker.
2. `CLAUDE_MODEL` picks the model; keep it in env so we can swap without a code change.
3. Claude is called **only from workers** (`src/workers/`), never inside an HTTP request.

### What Claude can actually see

Claude takes **images and text**, not video files. So for each clip we send:

- A **thumbnail strip**: a few frames from the clip (or the platform thumbnail for YouTube/TikTok/Twitch links when we can't extract frames)
- The **gamer's own description** of the clip
- Any metadata we have (platform, title, duration)

That's also our fallback for slow analysis. **Pre-analyse the demo clips on Wednesday** so the live demo isn't waiting on the API.

### Jobs and expected output

All prompts must ask for **JSON only**, and the worker must strip code fences and `JSON.parse` inside `try/catch`. On parse failure, retry once, then mark the job failed.

**Clip analysis** (`clip-analysis` queue) → written to `Clip`:

```json
{
  "game": "Valorant",
  "keyMoments": [{ "t": "0:07", "label": "1v3 clutch" }],
  "stats": { "kills": 3, "headshots": 2, "objective": "spike defused" },
  "tags": ["clutch", "1v3", "sheriff"],
  "aiQualityScore": 78
}
```

**Skill summary** (`skill-summary` queue) → written to `GamerProfile.aiSummary` after each analysed clip:

```json
{ "summary": "Aggressive Valorant duelist with strong clutch play...", "strengths": ["clutch", "aim"], "roles": ["duelist"] }
```

**Bounty verification** (`bounty-verification` queue) → written to `BountySubmission.aiVerdict`:

```json
{ "pass": true, "confidence": 0.86, "matchesGame": true, "taskCompleted": true, "looksReused": false, "reason": "Clip shows a 1v3 round win in Valorant." }
```

The AI verdict is **advisory**. The bounty creator (or a coach) still confirms before money moves.

---

## 11. Running the app

You normally need **three processes** locally:

| Terminal | Command | URL |
| --- | --- | --- |
| 1 | `npm run dev` | API: http://localhost:3000 |
| 2 | `npm run worker:dev` | (no URL; logs jobs) |
| 3 | `cd web && npm run dev` | Web: http://localhost:5173 |

Plus Docker (Postgres + Redis) in the background.

### Seeded demo accounts

`prisma/seed.ts` creates (password for all: see the Postman environment):

- 15 gamers across a few games (mix of FREE and PAID)
- 2 coaches (PAID)
- 1 sponsor
- 40 clips with votes, so the leaderboard isn't empty

Seed data should use **links we're allowed to use** (team-made clips from Rabasa's media set), not random creators' videos.

---

## 12. Architecture

```mermaid
flowchart LR
    WEB["React web app<br/>(Vite, Tailwind, AG Grid)"] -->|REST + JWT| API

    subgraph API["Fastify API"]
        AUTH[auth]
        CLIPS[clips]
        BNT[bounties]
        ADS[ads]
        PROF[profiles]
        COMM[communities]
        PAY["payments<br/>(only PayPal client)"]
        WH["webhooks<br/>(signature check)"]
        RANK["lib/ranking"]
    end

    API --> DB[(PostgreSQL)]
    API -->|enqueue| Q[(Redis / BullMQ)]
    Q --> W["Workers<br/>clip analysis, summaries,<br/>bounty verify, expiry"]
    W --> CLAUDE[Claude API]
    W --> DB
    W --> PAY
    PAY --> PP[PayPal REST APIs]
    PP -->|webhook events| WH
    WH --> PAY
    CLIPS --> RANK
    BNT --> RANK
```

Rules that keep this sane:

- **Only `payments/service.ts` talks to PayPal.** Everyone else calls its functions.
- **Only workers talk to Claude.**
- **Nothing is marked paid until a verified webhook (or a verified status poll) says so.**
- **Every wallet change is a `WalletEntry` row** written in a DB transaction.

### Core data flow: clip to leaderboard

```text
Gamer posts clip ──► POST /api/v1/clips ──► Clip row (status: PENDING) ──► enqueue clip-analysis
                                                                               │
Worker ◄───────────────────────────────────────────────────────────────────────┘
  ├─ calls Claude → tags, stats, aiQualityScore → Clip (status: ANALYSED)
  └─ enqueue skill-summary → GamerProfile.aiSummary

Viewer swipes ──► POST /api/v1/clips/:id/vote ──► Vote row ──► recordVote() ──► recomputeRadScore(gamerId)
                                                                                      │
GET /api/v1/leaderboard?game= ◄───────────────────────────────────────────────────────┘
```

---

## 13. Data model

Rabasa writes `schema.prisma`. **After Saturday, only the model owner changes a model.**

| Model | Owner | Key fields |
| --- | --- | --- |
| `User` | Rabasa | `email`, `passwordHash`, `role` (GAMER, COACH, SPONSOR), `tier` (FREE, PAID), `paypalPayerId`, `isVerifiedAdult` |
| `GamerProfile` | Rabasa | `userId`, `gamerTags`, `platforms`, `games`, `region`, `aiSummary`, `radScore` |
| `Clip` | Obonyo | `ownerId`, `url`, `description`, `game`, `tags`, `stats`, `aiQualityScore`, `eloRating`, `status` |
| `Vote` | Obonyo | `clipId`, `voterId`, `direction` (UP, DOWN), `weight` — unique on (`clipId`, `voterId`) |
| `Bounty` | Obonyo | `creatorId`, `type` (CHALLENGE, TOURNAMENT, DARE), `task`, `reward`, `deadline`, `status`, `paypalOrderId`, `authorizationId`, `communityId?` |
| `BountySubmission` | Obonyo | `bountyId`, `gamerId`, `clipId`, `aiVerdict`, `confirmed` |
| `WalletEntry` | Rabasa | `userId`, `amount` (signed, integer cents), `kind` (DONATION, BOUNTY, AD_SHARE, WITHDRAWAL, FEE, REVERSAL), `paypalRef` (unique) |
| `Subscription` | Rabasa | `userId`, `plan`, `paypalSubscriptionId`, `status` |
| `Community`, `CommunityMember` | Rabasa | `coachId`, `name`; `communityId`, `memberId`, `status` (PENDING, APPROVED, DECLINED) |
| `AdImpression` | Obonyo | `userId`, `adId`, `clipOwnerId`, `sessionId` |
| `Endorsement` | Fabiola | `coachId`, `gamerId` (input to rad score) |
| `WebhookEvent` | Gicharu | `paypalEventId` (unique), `eventType`, `receivedAt` (idempotency) |

### Money conventions

- Store money as **integer minor units (cents)** in `Int`, never `Float`.
- Wallet balance = `SUM(amount)` of a user's `WalletEntry` rows. Don't store a mutable balance column.
- `paypalRef` is **unique**, so a replayed webhook can't credit twice.
- A withdrawal writes a **negative** entry when requested; a failed payout writes a `REVERSAL` entry.

---

## 14. API reference

Base path: `/api/v1` (auth routes are at `/auth`). All responses are JSON. Authenticated routes need `Authorization: Bearer <jwt>`.

| Method + path | Owner | Auth / guard | Purpose | Ready by |
| --- | --- | --- | --- | --- |
| `GET /health` | Rabasa | none | DB + Redis check | Sat |
| `POST /auth/signup` | Rabasa | none | Create account with role (tier starts FREE) | Sat |
| `POST /auth/login` | Rabasa | none | Returns JWT | Sat |
| `POST /api/v1/clips` | Obonyo | GAMER | Add clip link + description, queue AI job | Sat |
| `GET /api/v1/feed?cursor=` | Obonyo | any user | Paged swipe feed, excludes own clips, ads interleaved for FREE | Sun |
| `POST /api/v1/clips/:id/vote` | Obonyo | any user | `{ "direction": "UP" \| "DOWN" }` | Sun |
| `GET /api/v1/leaderboard?game=` | Fabiola | none | Gamers ranked by rad score | Sun |
| `POST /api/v1/donations` | Rabasa | any user | `{ gamerId, amount }` → `{ approvalUrl, orderId }` | Sun |
| `POST /api/v1/subscriptions` | Rabasa | GAMER or COACH | `{ plan }` → `{ approvalUrl, subscriptionId }` | Sun |
| `POST /api/v1/webhooks/paypal` | Gicharu (verify) + Rabasa (handlers) | PayPal signature | Payment, subscription, payout events | Sun |
| `GET /api/v1/gamers/:id` | Rabasa | none | Public Gamer ID | Mon |
| `GET /api/v1/gamers/:id/dashboard` | Rabasa | owner, COACH (read-only), SPONSOR (summary only) | Stats for AG Charts | Mon |
| `POST /api/v1/wallet/withdraw` | Rabasa | owner + verified adult | Payout to gamer's PayPal | Mon |
| `POST /api/v1/bounties` | Obonyo | verified adult | Create bounty → `{ approvalUrl }` (authorize) | Mon |
| `GET /api/v1/bounties` | Obonyo | any user | List open bounties | Mon |
| `POST /api/v1/bounties/:id/submissions` | Obonyo | GAMER + verified adult | Submit clip, queue verification | Mon |
| `POST /api/v1/bounties/:id/confirm` | Obonyo | bounty creator (or coach) | Confirm winner → capture + payout | Mon |
| `POST /api/v1/communities` | Rabasa | COACH | Create community | Tue |
| `POST /api/v1/communities/:id/join` | Rabasa | GAMER | Request to join | Tue |
| `POST /api/v1/communities/:id/requests/:requestId` | Rabasa | community's coach | `{ "decision": "APPROVE" \| "DECLINE" }` | Tue |
| `GET /api/v1/ads/next?sessionId=` | Obonyo | any user | House ad for FREE, `204` for PAID | Tue |
| `GET /api/v1/coach/matches` | Obonyo | COACH | AI talent matches | Tue |

### Error format

Use one shape everywhere so Nigel can handle errors once:

```json
{ "error": { "code": "NOT_VERIFIED_ADULT", "message": "A verified adult PayPal account is required to withdraw." } }
```

Common codes: `UNAUTHENTICATED` (401), `FORBIDDEN_ROLE` (403), `FORBIDDEN_TIER` (403), `NOT_VERIFIED_ADULT` (403), `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PAYPAL_ERROR` (502).

### Example: create a clip

```bash
curl -X POST http://localhost:3000/api/v1/clips \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=XXXX",
    "description": "1v3 clutch on Ascent with the Sheriff",
    "game": "Valorant"
  }'
# 202 { "id": "clp_...", "status": "PENDING" }
```

---

## 15. Money flows

### 15.1 Donation (push-to-pay)

1. `POST /api/v1/donations` → `payments.createOrder({ intent: "CAPTURE" })`.
2. API returns PayPal's **approval link**; frontend shows the push-to-pay prompt (in-app; WhatsApp is stretch).
3. Fan approves in PayPal; returns to `WEB_ORIGIN`.
4. Backend captures the order (on return or on `CHECKOUT.ORDER.APPROVED`).
5. On `PAYMENT.CAPTURE.COMPLETED` (verified): one DB transaction writes
   - `+amount` DONATION to the gamer
   - `-fee` FEE to the gamer (fee from `DONATION_FEE_BPS`, lower for PAID gamers)

### 15.2 Subscription

1. `POST /api/v1/subscriptions` with `plan` → PayPal subscription → approval link.
2. User approves.
3. `BILLING.SUBSCRIPTION.ACTIVATED` → `Subscription.status = ACTIVE`, `User.tier = PAID`.
4. Cancel/expire/suspend events → `tier = FREE`. Ads return.

### 15.3 Bounty (escrow)

```mermaid
sequenceDiagram
    actor Sponsor
    participant API as Play2Pro API
    participant PP as PayPal
    participant W as Worker (Claude)
    actor Gamer

    Sponsor->>API: POST /bounties (task, reward, deadline)
    API->>PP: Create order (intent AUTHORIZE)
    API-->>Sponsor: approvalUrl
    Sponsor->>PP: Approve
    API->>PP: Authorize order
    PP-->>API: Webhook: authorization created (verified)
    API->>API: Bounty status OPEN, schedule expiry job
    Gamer->>API: POST /bounties/:id/submissions
    API->>W: enqueue bounty-verification
    W-->>API: aiVerdict
    Sponsor->>API: POST /bounties/:id/confirm
    API->>PP: Capture authorization
    API->>PP: Payout to gamer (reward minus commission)
    API->>API: Wallet entries, achievement, recomputeRadScore
    Note over API,PP: Deadline passes with no confirmed winner → voidAuthorization, status EXPIRED
```

Bounty statuses: `DRAFT → AWAITING_APPROVAL → OPEN → VERIFYING → COMPLETED` or `→ EXPIRED` / `→ CANCELLED`.

Rules:

- Creator **and** entrants must be verified adults.
- Deadline must be inside the authorization limit (and short for the demo).
- Confirm is **idempotent**: a double-click must not capture twice. Check status inside a transaction / row lock before calling PayPal.

### 15.4 Withdrawal

1. `POST /api/v1/wallet/withdraw` `{ amount }` (verified adult, amount ≤ balance).
2. Write a negative `WITHDRAWAL` entry, then `payments.payout()` via Payouts API.
3. `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` → mark paid. Failure events → `REVERSAL` entry restores the balance.

---

## 16. Ranking engine (Elo + rad score)

Lives in `src/lib/ranking/` as **pure functions with unit tests** (Fabiola). No DB calls inside the math; DB access stays in thin wrappers (`recordVote`, `recomputeRadScore`).

### 16.1 Elo

Standard Elo expected score and update:

```text
E_a  = 1 / (1 + 10^((R_b - R_a) / 400))
R_a' = R_a + K × w × (S_a − E_a)
```

- `S_a` = 1 for an upvote "win", 0 for a downvote "loss"
- `K` = K-factor (higher for new clips so they move faster)
- `w` = vote weight: coaches and verified gamers count more than anonymous/free voters
- New clips start at `1500` (placeholder)

How a swipe becomes a pairwise comparison (what `R_b` is: the previous clip in the voter's session, or a baseline rating) is Fabiola's call; document the final choice in `src/lib/ranking/README.md`.

### 16.2 Rad score

A gamer's single credibility score, shown on the Gamer ID and used to rank leaderboards per game:

```text
radScore = w1·votes(Elo) + w2·bountiesCompleted + w3·tournamentResults
         + w4·coachEndorsements + w5·aiQualityScore + w6·engagement
```

Weights are **placeholders until the Sunday morning sync**. Keep them in one exported constant so they're easy to tune. Normalise each input to the same range (e.g. 0–100) before weighting.

### 16.3 When to recompute

- After every vote: `recordVote()` → `recomputeRadScore(clip.ownerId)`
- After a completed bounty, a new endorsement, or a new AI quality score

If recompute gets slow, move it onto a BullMQ queue; the function signature stays the same.

---

## 17. Background jobs (BullMQ)

All queues are defined in `src/lib/queues.ts`; workers are started by `src/workers/index.ts`.

| Queue | Enqueued by | Does | Retries |
| --- | --- | --- | --- |
| `clip-analysis` | `POST /clips` | Claude tags clip, writes stats + `aiQualityScore`, enqueues `skill-summary` | 3, exponential backoff |
| `skill-summary` | `clip-analysis` | Regenerates `GamerProfile.aiSummary` | 2 |
| `bounty-verification` | `POST /bounties/:id/submissions` | Claude checks clip vs task, writes `aiVerdict` | 2 |
| `bounty-expiry` | bounty goes OPEN (delayed job at `deadline`) | If no confirmed winner: `voidAuthorization()`, status `EXPIRED` | 3 |
| `notifications` (stretch) | payments/bounties | Zapier MCP → WhatsApp | 3 |

Guidelines:

- Jobs must be **idempotent**: a retried job must not double-write or double-pay.
- Use a deterministic `jobId` (e.g. `clip-analysis:<clipId>`) to avoid duplicate jobs.
- Log job start/finish/failure with the job ID.
- Inspect queues locally with `redis-cli` or a dashboard like Bull Board if someone sets it up.

---

## 18. Auth, roles, tiers and guards

- JWT issued on login; payload includes `userId`, `role`, `tier`. **Re-read `tier` from the DB** on sensitive routes, since it changes via webhook after the token was issued.
- Passwords hashed (bcrypt or argon2). Never log request bodies on auth routes.

Guards (Gicharu, in `src/middleware/`), used as Fastify `preHandler` hooks:

| Guard | Rejects with | Used on |
| --- | --- | --- |
| `requireAuth` | 401 `UNAUTHENTICATED` | Every non-public route |
| `requireRole(...roles)` | 403 `FORBIDDEN_ROLE` | Coach/sponsor/gamer-only routes |
| `requireTier("PAID")` | 403 `FORBIDDEN_TIER` | Paid-only analytics |
| `requireVerifiedAdult` | 403 `NOT_VERIFIED_ADULT` | Withdraw, bounty create, bounty entry |

**Under-18 rule:** many gamers are minors. Withdrawals, bounty creation/entry and receiving donations require `isVerifiedAdult = true` on a linked PayPal account. For the demo, seed data sets this flag; document in the pitch how real verification would work.

### Who sees what

| Viewer | Gamer ID | Dashboard |
| --- | --- | --- |
| Public / free users | Yes | No |
| Coaches | Yes | Yes, read-only |
| Sponsors | Yes | Summary stats only |
| The gamer | Yes | Yes, plus wallet |

Enforce this in the API, not just by hiding UI.

---

## 19. Ads

`GET /api/v1/ads/next?sessionId=` (Obonyo):

- **PAID gamers and coaches:** always `204 No Content`.
- **FREE gamers and sponsors:** a **house ad** (Play2Pro promo) every `ADS_EVERY_N_CLIPS`, up to `ADS_PER_SESSION_CAP` per session.
- Each shown ad writes an `AdImpression` (with `clipOwnerId`), which later drives the paid-gamer revenue share.

The sponsor campaign builder is on the **cut list**; the demo only needs house ads plus the ad-free switch on upgrade.

---

## 20. Testing

### 20.1 Unit tests

```bash
npm test
```

Priority: everything in `src/lib/ranking/` (Elo math, weights, edge cases like a brand-new clip or a single vote), fee calculations, and webhook verification logic (with mocked PayPal responses).

### 20.2 Postman

- Import `postman/Play2Pro.postman_collection.json` and `postman/sandbox.postman_environment.json`.
- The environment holds `baseUrl`, tokens for each demo role, and sandbox buyer logins. **Don't export it with real secrets into Git**; keep secret values as "current value" only.
- Folders: Auth · Clips & Feed · Leaderboard · Donations · Subscriptions · Bounties · Wallet · Communities · Ads · Webhooks (incl. "Simulate webhook" and "Forged webhook").

Run from the CLI:

```bash
npm run test:api
```

### 20.3 Must-pass flows (Fabiola, Monday)

1. Donation → wallet credited after webhook
2. Subscription → tier flips to PAID → ads disappear
3. Full bounty → authorize, submit, AI verify, confirm, capture, payout, rad score updates
4. Expired bounty → authorization voided
5. Withdraw → payout succeeds; failed payout reverses
6. Forged webhook (bad signature) → `400`, nothing changes
7. Under-18 / unverified account → blocked from withdraw and bounty entry

### 20.4 Bugs

Log every bug in the team tracker with: steps to reproduce, expected vs actual, which user/role, and the endpoint. Fabiola reads the top bugs at the 7 pm sync.

---

## 21. Git workflow and conventions

- `main` is always deployable; Render deploys from it.
- **One branch per person per feature:** `rabasa/payments-donations`, `obonyo/bounty-expiry`, `fabiola/rad-score`, `gicharu/webhook-verify`, `nigel/swipe-feed`.
- **Small PRs.** Rabasa merges to `main`.
- **Don't edit another owner's plugin folder** without asking.
- Merge to `main` at the **11 pm sync** Mon–Wed; Render redeploys.
- Run before pushing: `npm run lint && npm run typecheck && npm test`.

Commit messages: `area: what changed`, e.g. `payments: add voidAuthorization`, `ranking: tune K-factor for new clips`.

Code conventions:

- TypeScript `strict` mode on.
- Validate every request body with Fastify JSON schemas (or zod).
- No secrets, tokens or PayPal payloads with personal data in logs.
- Money in integer cents. Dates in UTC ISO strings.
- Talk to PayPal only through `payments/service.ts`; talk to Claude only from `src/workers/`.

---

## 22. Deploying to Render

Rabasa owns this (Tuesday). Create these services in one Render project:

| Service | Type | Build command | Start command |
| --- | --- | --- | --- |
| `play2pro-api` | Web Service (Node) | `npm ci && npx prisma generate && npm run build` | `npx prisma migrate deploy && npm start` |
| `play2pro-worker` | Background Worker (Node) | `npm ci && npx prisma generate && npm run build` | `npm run worker` |
| `play2pro-db` | PostgreSQL | — | — |
| `play2pro-redis` | Key Value (Redis-compatible) | — | — |
| `play2pro-web` | Static Site | `cd web && npm ci && npm run build` | publish dir: `web/dist` |

Steps:

1. Create Postgres and Key Value first; copy their **internal** connection URLs.
2. Create the API and worker; set **all** backend env vars from [section 8](#81-backend-env) on both (`DATABASE_URL` and `REDIS_URL` use the internal URLs). Set `APP_BASE_URL` to the API's Render URL and `WEB_ORIGIN` to the static site URL.
3. Create the static site with `VITE_API_URL` = API URL. Add a rewrite rule `/* → /index.html` so client-side routes work.
4. Seed once: run `npm run db:seed` from the API's Render shell.
5. Point the PayPal sandbox webhook at `https://<api>.onrender.com/api/v1/webhooks/paypal` and update `PAYPAL_WEBHOOK_ID` if it's a new webhook.
6. Run the demo script on the deployed URL as each role.

Notes:

- Check which instance types our plan allows: background workers may not be available on the free tier. If they aren't and credits are tight, a fallback is starting the workers inside the API process behind an env flag (`RUN_WORKERS_IN_API=true`).
- Free web services **sleep and cold-start**. Hit the URL a few minutes before demoing.
- Watch logs during the first deploy; a missing env var should crash at startup (by design).

---

## 23. Demo-ready checklist

Fabiola signs off each item **on the deployed Render URL** before the **9 pm freeze on Wednesday**.

- [ ] Sign up as Gamer, Coach and Sponsor; free sees ads, paid doesn't
- [ ] Add a clip; AI tags and skill summary appear on the Gamer ID within a minute
- [ ] Swipe on clips; rad score and leaderboard update
- [ ] Donate with push-to-pay; wallet updates after the webhook
- [ ] Sponsor creates a bounty (authorized), gamer submits, AI verifies, sponsor confirms, funds captured and paid out
- [ ] Expired bounty voids the authorization
- [ ] Coach views a gamer's dashboard (AG Charts), approves a community join request, sees AI matches
- [ ] Gamer withdraws from the wallet via Payouts
- [ ] Subscription upgrade flips the user to PAID and removes ads
- [ ] Forged webhook (bad signature) is rejected
- [ ] Demo video recorded; repo, video and pitch doc linked in the submission

### Daily "done when"

| Day | Done when |
| --- | --- |
| Sat 7 Nov | A clip can be posted locally, its job is picked up by the worker, and ranking tests pass |
| Sun 8 Nov | In sandbox, a donation is approved and the webhook credits the wallet; voting on seeded clips changes the leaderboard |
| Mon 9 Nov | A full bounty runs in sandbox: authorize, submit, AI verify, capture, payout, rad score update |
| Tue 10 Nov | The whole demo script works on the deployed URL |
| Wed 11 Nov | Bugs fixed (7–9 pm), freeze at 9 pm, video recorded, submitted before midnight |

### Sync points

| When | Who | Purpose |
| --- | --- | --- |
| Sat, start | Everyone | Agree API contract and Prisma schema |
| Sun, morning | Everyone | Agree rad score weights; check Saturday's done-when |
| Sun, evening | Rabasa, Obonyo, Gicharu | First full donation through the webhook |
| Mon–Wed, 7 pm | Everyone, 10 min | What's blocked; Fabiola reads out top bugs |
| Mon–Wed, 11 pm | Everyone | Push and merge to `main`; Render redeploys |

---

## 24. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `P1001: Can't reach database server` | Docker not running / wrong `DATABASE_URL` | `docker compose up -d`; check port 5432 isn't used by a native Postgres |
| `ECONNREFUSED 127.0.0.1:6379` | Redis not running | `docker compose up -d redis` |
| Prisma client out of date after pulling | Someone changed the schema | `npx prisma migrate dev` (or `npx prisma generate`) |
| Migration conflict after merging | Two people created migrations | Tell Rabasa; only the model owner changes a model |
| Clip stuck in `PENDING` | Worker not running, or Claude error | Start `npm run worker:dev`; check worker logs and `ANTHROPIC_API_KEY` |
| Worker logs JSON parse errors | Claude returned prose or code fences | Tighten prompt ("JSON only"), strip fences before parsing |
| PayPal `401` | Expired token / wrong client ID+secret / live vs sandbox mix-up | Check `PAYPAL_API_BASE` is sandbox; refresh token |
| Webhook verification always fails | Wrong `PAYPAL_WEBHOOK_ID`, or body was re-serialised | Use the ID of the webhook that's actually sending; verify with the raw event |
| No webhooks arriving locally | No tunnel / webhook points at old URL | Restart tunnel, update webhook URL in the sandbox app |
| Payout fails in sandbox | Payouts not enabled, or platform sandbox account has no balance | Enable Payouts on the app; top up sandbox business account |
| Capture of bounty authorization fails | Authorization voided or past its limit | Use short demo deadlines; check bounty status before capture |
| CORS error in the browser | `WEB_ORIGIN` doesn't match the frontend URL | Set it exactly (scheme + host + port) |
| Render deploy works but API 502s on first hit | Cold start | Wait / hit `/health` before demoing |
| Ads still show after upgrading | JWT carries old tier | Re-read tier from DB on `/ads/next`; refresh token after subscription activates |

---

## 25. Scope: cut list and out of scope

### Cut first if we fall behind (in this order)

1. Zapier MCP WhatsApp notifications → show in-app notifications instead
2. Sponsor ad campaign builder → keep the house ad only
3. Coach communities beyond create + request to join + approve
4. AI trust and safety flags → mention in the pitch, don't build
5. Invoicing API → describe in the compliance section

**Never cut payments or bounties.**

### Out of scope

- Coach pay-to-unlock footage (removed)
- Real KYC/age verification beyond the `isVerifiedAdult` flag
- Live PayPal (production) credentials
- Native mobile apps

### Known risks and fallbacks

| Risk | Fallback |
| --- | --- |
| PayPal sandbox webhooks slow/flaky during demo | "Simulate webhook" Postman request; poll order status |
| Claude slow on long clips | Thumbnail strip + description; pre-analyse demo clips Wednesday |
| Authorization expiry vs bounty deadline | Demo bounties use deadlines in hours |
| Payouts sandbox needs extra setup | Set up sandbox personal accounts Saturday |
| Render free tier sleeps | Warm it up before demoing; upgrade if credits allow |
| School night runs short | Follow the cut list |
| Schema-change bottleneck | Changes go through the model owner only |

---

## 26. Glossary

| Term | Meaning |
| --- | --- |
| **Gamer ID** | Public profile proving who a gamer is and what they've done |
| **Dashboard** | Private/coach view of a gamer's growth, stats and wallet |
| **Rad score** | Single consolidated credibility score; ranks the leaderboard |
| **Elo** | Rating system that turns win/loss comparisons into a score |
| **Push-to-pay** | Our one-tap PayPal approval prompt, inspired by mobile money push prompts |
| **Authorize / capture / void** | PayPal escrow steps: hold funds, take funds, release the hold |
| **House ad** | A Play2Pro promo shown in place of sponsor ads for the demo |
| **Verified adult** | User with a verified adult PayPal account; required for money features |
| **Wallet ledger** | Append-only `WalletEntry` rows; balance is their sum |

---

### Related docs (in the project folder)

- [[Play2Pro Implementation Plan (7–11 Nov)]]: schedule, owners, daily tasks
- [[Play2Pro Turning Casual Gamers into Professionals]]: product spec
- *Play2Pro Pitch*: submission answers (note: still mentions unlock fees, which are out of scope; not in this vault)
- [[play2pro_architecture_tech_stack]]: sponsor tool mapping
- [[Database]]: ERD and domain overview
- [[Team Members]] · [[Rabasa Workstreams Index]] · [[Wireframes Index]] · [[Home]]