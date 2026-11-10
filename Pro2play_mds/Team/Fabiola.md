---
type: person
role: Project Manager, QA & Submission
tags: [team]
---

# Fabiola

**Owns:** `src/lib/ranking/` (Elo, rad score, leaderboard), `src/plugins/leaderboard/`, `prisma/seed.ts`, `postman/tests/`, `tests/ranking/`, `docs/demo-script.md`, `docs/submission.md`. **Model:** Endorsement.

## Interfaces with [[Rabasa]]
- Needs Rabasa's migrated schema before `seed.ts` can run (15 gamers, 2 coaches, 1 sponsor, 40 clips). Seed must set `isVerifiedAdult` on demo accounts.
- Writes Postman tests against Rabasa's [[Postman Collection]] (donation, subscription, bounty and withdraw flows).
- Runs end-to-end QA on the Render URL from the [[Render Deployment Runbook]] and signs off the demo-ready checklist before the 9 pm freeze.
- [[Profiles & Dashboard API]] reads `radScore` and its history, which ranking computes.

Back to [[Team Members]].
