# Play2Pro UI: backend sync guide

Branch `web/ui-reskin` (from `origin/main`). The new UI changes the look and layout. The one API-facing change is the vote body (`{ direction }` only, see section 4). The switches (`VITE_USE_MOCKS`, `VITE_REAL_API`) work as before.

## 1. Local run

```
cd web
npm ci
npm run dev            # http://localhost:5173
```

`web/.env` is local and gitignored. It is set to read the deployed API:

```
VITE_API_URL=https://geeks-azyy.onrender.com
VITE_USE_MOCKS=true
VITE_REAL_API=/auth,/api/v1/leaderboard,/api/v1/feed,/api/v1/gamers
```

- `VITE_USE_MOCKS=true` keeps everything on mock data.
- `VITE_REAL_API` lists the path prefixes that go to the real API. Everything else stays on mocks.
- Restart `npm run dev` after changing `.env`. Vite reads it at start.

## 2. Route-by-route status

| Screen | Route | API call | Prefix to add to `VITE_REAL_API` | Status |
| --- | --- | --- | --- | --- |
| Login, signup | `/login`, `/signup` | `/auth/*` | `/auth` | Real (live, tested by Rabasa 10 Nov) |
| Arena feed | `/feed` | `GET /api/v1/feed?cursor=` | `/api/v1/feed` | Real shape matches (checked live 12 Nov) |
| Arena vote | `/feed` | `POST /api/v1/clips/:id/vote` | `/api/v1/clips` | Real (body is direction only; fixed 12 Nov) |
| Leaderboard | `/leaderboard` | `GET /api/v1/leaderboard` | `/api/v1/leaderboard` | Real |
| Gamer ID, dashboard | `/gamers/:id`, `/dashboard` | `GET /api/v1/gamers/:id[/dashboard]` | `/api/v1/gamers` | Real when the API is on `main` (see section 5) |
| Wallet | `/wallet` | `GET /api/v1/wallet`, `POST /api/v1/wallet/withdraw` | `/api/v1/wallet` | Real when deployed |
| Donate, payment return | `/gamers/:id?donate=1`, `/pay/return` | `POST /api/v1/donations`, `GET /api/v1/orders/:id` | `/api/v1/donations`, `/api/v1/orders` | Real when deployed |
| Bounties | `/bounties*` | `/api/v1/bounties*` | `/api/v1/bounties` | Not yet checked against the API |
| Discover | `/discover` | `/api/v1/...` (check `features/discover/api.ts`) | per API | Not yet checked |
| Upgrade | `/upgrade` | `POST /api/v1/subscriptions` | `/api/v1/subscriptions` | Real when deployed |

Route paths and API paths are listed in `web/src/components/layout/nav-config.ts` and each feature's `api.ts`. If an endpoint is missing from the API, leave its prefix out of `VITE_REAL_API` and the screen falls back to mocks.

## 3. Hybrid rollout (one prefix at a time)

1. Add the prefix to `web/.env` (local) and run the screen.
2. Check it: loading, empty, error and success states all work, and no 404 or console error.
3. When every screen is green, set `VITE_USE_MOCKS=false`, then delete the mock code (planned by Nigel as N6).
4. Rollback: remove the prefix from `VITE_REAL_API`.

## 4. Vote contract (fixed)

The API takes the voter from the JWT and rejects extra body fields (`additionalProperties: false`). The web sent `voterId`, which returned 400. Fixed on this branch in `web/src/features/feed/api.ts` (body is `{ direction }`), `web/src/types/api.ts` (`VoteRequest`) and `web/src/mocks/index.ts` (mock checks `direction`). Nigel and Obonyo should review these edits.

## 4a. Donate shows "Order creation failed"

If `/api/v1/donations` is not in `VITE_REAL_API`, the donate request is answered by the mock. The mock only knows its own fixture gamers, so a real gamer returns 404 and the modal shows the generic error. The API log then has no `POST /api/v1/donations` at all. Fix: add `/api/v1/donations,/api/v1/orders` to the static site env, rebuild, and make sure `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set on `geeks`.

## 5. Backend version

- The deployed API (`geeks`) runs branch `worktree-rabasa-render-skeleton`, not `main`. The features on `main` (profiles and dashboard, paged feed, vote from JWT) do not reach Render until the deploy branch is switched to `main` and redeployed. Until then the gamer and wallet pages show "not found" or mock data.
- After switching: `GET https://geeks-azyy.onrender.com/api/v1/gamers/<id>/dashboard` should return 200 with a token (401 without one).
- Seeded YouTube clips need a re-seed. It writes to the database, so confirm before running (see `docs/` and the Rabasa Remaining Work Map).

## 6. Deploying the static site

Render static site (`play2pro-web`):

| Key | Value |
| --- | --- |
| `VITE_API_URL` | `https://geeks-azyy.onrender.com` |
| `VITE_USE_MOCKS` | `true` for now |
| `VITE_REAL_API` | `/auth,/api/v1/leaderboard,/api/v1/feed,/api/v1/clips,/api/v1/gamers,/api/v1/donations,/api/v1/orders,/api/v1/wallet` |
| `VITE_PAYPAL_CLIENT_ID` | sandbox client ID (public) |

Build command: `npm install && npm run build`. Publish directory: `dist`. Rewrite `/*` to `/index.html`. Rebuild after every change to these values: Manual Deploy → Deploy latest commit.

CORS: the API already allows `https://play2pro-web.onrender.com` (checked 12 Nov).

## 7. Checks before a push

```
cd web
npm run check     # lint + typecheck
npm run build
```

Then walk `docs/ui-parity-checklist.md` as gamer, coach and sponsor.
