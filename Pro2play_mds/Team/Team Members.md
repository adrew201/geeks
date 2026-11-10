---
type: moc
tags: [team]
---

# Team Members

Team Quest · PayPal Hackathon. Back to [[Home]].

| Member | Role (from product spec) | Owns (from plan + repo `docs/instructions.md`) | Works most with |
| --- | --- | --- | --- |
| [[Rabasa]] | Backend, DevOps & Media | Platform skeleton, Prisma schema, auth, PayPal + wallet ledger, profiles, communities, Render, CI, Postman, demo video | Obonyo, Gicharu |
| [[Obonyo]] | Product Lead & AI Engineer | Redis/BullMQ, Claude workers, clips/feed/votes, bounties, ads, coach matching | Rabasa, Fabiola |
| [[Fabiola]] | Project Manager, QA & Submission | Ranking library (Elo, rad score), leaderboard, seed data, Postman tests, QA, submission | Everyone |
| [[Gicharu]] | Payments Security & Integration | Webhook signature verification, role/tier/adult guards, payments security pass | Rabasa |
| [[Nigel]] | UI/UX Lead & User Research | `web/`: swipe feed, Gamer ID, push-to-pay, bounty screens, AG Grid/Charts dashboards | All backend owners |

## Rules everyone follows
- Don't edit another owner's folder without asking. Each Prisma model has one owner after Saturday.
- Commits use the Chainforge format → [[chainforge-commit-sop]].
- Commit straight to `main` (repo `docs/instructions.md` overrides the plan's "Rabasa merges" rule).
- Source: [[Play2Pro Implementation Plan (7–11 Nov)]], [[Specs/README|README]] §2.
