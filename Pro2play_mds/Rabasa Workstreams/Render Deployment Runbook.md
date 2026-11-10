---
type: workstream
owner: Rabasa
day: Tue 10 Nov
status: todo
priority: P0
tags: [rabasa, render, deploy, devops]
---

# Render Deployment Runbook

Rabasa owns deployment and `render.yaml` (Render partner prize). Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §22 · Architecture: [[play2pro_architecture_tech_stack]]

## Services

| Service | Type | Build | Start |
| --- | --- | --- | --- |
| `play2pro-api` | Web Service (Node) | `npm ci && npm run build` | `npx prisma migrate deploy && npm start` |
| `play2pro-worker` | Background Worker | `npm ci && npm run build` | `npm run start:worker` |
| `play2pro-db` | PostgreSQL | — | — |
| `play2pro-redis` | Key Value | — | — |
| `play2pro-web` | Static Site | `cd web && npm ci && npm run build` | publish `web/dist`, rewrite `/* → /index.html` |

> [!warning] Script names differ from the README
> The repo's `package.json` has `build` = `prisma generate && tsc` and `start:worker` (not `worker`). The README §22 table says `npm run worker`. Use the repo names above and fix the README.

## Steps
1. [ ] Create Postgres + Key Value first; copy the **internal** URLs
2. [ ] Create the API + worker, then set all env vars from [[Specs/README|README]] §8.1 on **both** (`APP_BASE_URL` = API URL, `WEB_ORIGIN` = static site URL). Use an Environment Group so they can't drift.
3. [ ] Health check path `/health` (see [[Platform Skeleton & Config]])
4. [ ] Static site with `VITE_API_URL` = API URL and `VITE_PAYPAL_CLIENT_ID`
5. [ ] Seed once from the API shell: `npm run db:seed` (needs `tsx` at runtime; it's a devDependency, so `npm ci` must include dev deps, or compile the seed)
6. [ ] PayPal sandbox webhook → `https://<api>.onrender.com/api/v1/webhooks/paypal`; update `PAYPAL_WEBHOOK_ID` if it's a new webhook
7. [ ] Run the demo script as each role → hand to [[Fabiola]] for QA

## `render.yaml` sketch (Blueprint)
```yaml
services:
  - type: web
    name: play2pro-api
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npx prisma migrate deploy && npm start
    healthCheckPath: /health
    envVars:
      - fromGroup: play2pro-backend
      - key: DATABASE_URL
        fromDatabase: { name: play2pro-db, property: connectionString }
      - key: REDIS_URL
        fromService: { type: keyvalue, name: play2pro-redis, property: connectionString }
  - type: worker
    name: play2pro-worker
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npm run start:worker
    envVars:
      - fromGroup: play2pro-backend
      - key: DATABASE_URL
        fromDatabase: { name: play2pro-db, property: connectionString }
      - key: REDIS_URL
        fromService: { type: keyvalue, name: play2pro-redis, property: connectionString }
  - type: keyvalue
    name: play2pro-redis
    ipAllowList: []
databases:
  - name: play2pro-db
```
Check the field names against Render's current Blueprint spec before relying on this.

## Gotchas
- **Free tier:** background workers may not be available. Fallback: `RUN_WORKERS_IN_API=true` starts the BullMQ workers inside the API process. Needs a small change in `src/server.ts` that imports `src/workers/index.ts` (coordinate with [[Obonyo]]).
- Free web services **sleep and cold-start**. Hit the URL a few minutes before the demo.
- BullMQ needs the Key Value `maxmemory-policy` set to `noeviction`
- Every push to `main` redeploys. **Pause auto-deploy while recording the demo video.**
- Lockfile built on Windows missing Linux optional binaries (`@rollup/rollup-linux-x64-gnu`): Rabasa regenerates it once → [[CI & Repo Hygiene]]
- `migrate deploy` runs on every start. A bad migration will crash-loop the API, so watch the first deploy's logs.

## Done when
- [ ] Tue "done when": the whole demo script works on the deployed URL
- [ ] Demo checklist items pass on Render, not localhost

Related: [[Freeze, Demo Video & Submission]] · [[Webhook Handlers]]
