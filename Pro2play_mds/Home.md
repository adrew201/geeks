---
type: moc
tags: [play2pro, index]
---

# Play2Pro — Vault Home

> Turning casual gamers into professionals. Team Quest · PayPal Hackathon · 7–11 Nov 2026
> **Code freeze: Wed 11 Nov, 9 pm. Submit before midnight.**

## Start here

| If you want… | Open |
| --- | --- |
| What the product is and why | [[Play2Pro Turning Casual Gamers into Professionals]] (product spec) |
| The schedule, owners and daily tasks | [[Play2Pro Implementation Plan (7–11 Nov)]] |
| How to set up and work in the repo | [[Specs/README\|Developer Handbook (README)]] |
| Architecture and sponsor-tool mapping | [[play2pro_architecture_tech_stack]] |
| Database design and ERD | [[Database]] |
| Screen designs | [[Wireframes Index]] |
| Commit and branch format | [[chainforge-commit-sop]] |
| Who does what | [[Team Members]] |

## Team

- [[Rabasa]] — Backend, platform, payments, profiles, communities, DevOps, demo video → [[Rabasa Workstreams Index]]
- [[Obonyo]] — AI agent, highlights, bounties, ads, coach matching
- [[Fabiola]] — Ranking engine, seed data, QA, submission
- [[Gicharu]] — Payment security, webhook verification, guards
- [[Nigel]] — Frontend (React, Vite, Tailwind, AG Grid / AG Charts)

## Vault layout

```text
Home.md                     ← you are here
Specs/                      product spec, plan, handbook, architecture, database
Team/                       one note per teammate + Team Members
Rabasa Workstreams/         Rabasa's detailed dev responsibilities (one note per workstream)
Process/                    commit SOP and team process
Wire_Frames/                UI wireframe images + Wireframes Index
```

## Source of truth

1. If docs disagree, **the implementation plan wins** ([[Specs/README|README]] rule), then fix the other doc.
2. The code repo (`github.com/adrew201/geeks`) also carries `docs/overview.md`, `docs/architecture.md`, `docs/database.md`, `docs/instructions.md`. `docs/instructions.md` is the newest team-process doc and **replaces the "branch per feature, Rabasa merges" rule with "commit straight to `main`"**.
3. Known contradictions are tracked in [[Schema Reconciliation]] and [[Open Decisions]].
