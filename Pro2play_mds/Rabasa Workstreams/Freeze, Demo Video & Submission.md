---
type: workstream
owner: Rabasa
day: Wed 11 Nov
status: todo
priority: P0
tags: [rabasa, demo, freeze]
---

# Freeze, Demo Video & Submission

Rabasa is the **post-freeze gatekeeper** and **records the demo video** (spec role: "Backend, DevOps & Media"). Up: [[Rabasa Workstreams Index]] · Plan: [[Play2Pro Implementation Plan (7–11 Nov)]] §4 Wed, §7 · Repo `docs/instructions.md` §9

## Wednesday timeline
| Time | Rabasa does |
| --- | --- |
| 7–9 pm | Fix bugs from [[Fabiola]]'s list, highest demo impact first |
| 9 pm | **Freeze.** Every fix is announced in chat and checked by Rabasa before pushing. No features, dependencies or migrations unless they fix a demo blocker. |
| ~9:15 pm | Warm up Render, **pause auto-deploy**, record the video |
| after recording | `git tag -a v1.0-submission -m "Submission" && git push origin v1.0-submission` on the recorded commit |
| before midnight | Give Fabiola the video link for the submission |

## Demo video shot list (follows spec §10, ~3–4 min)
1. **Sign up** as a gamer → Gamer ID created *(auth)*
2. **Add a clip** → AI tags + skill summary appear *(Obonyo; use pre-analysed clips)*
3. **Swipe** → rad score and leaderboard move. FREE user sees an ad; after **subscribing** (PayPal sandbox approval) the ad is gone *(subscriptions)*
4. **Donate** with push-to-pay → wallet credited after the webhook *(payments + webhooks + ledger)*
5. **Bounty:** sponsor posts (authorize), gamer submits, AI verifies, sponsor confirms → capture + payout
6. **Coach view:** gamer dashboard in AG Charts, approve a community join request, booking link *(profiles + communities)*
7. **Withdraw** via Payouts *(wallet)*
8. 10-second architecture slide: PayPal Orders / Subscriptions / Payouts / Webhooks, Render, AG Grid, Claude

## Pre-record checklist
- [ ] Sandbox accounts logged in, in separate browser profiles (fan, gamer, coach, sponsor)
- [ ] Platform sandbox business account has a balance (payouts)
- [ ] Short-deadline bounty pre-created as backup
- [ ] Postman "Simulate webhook" ready if sandbox webhooks lag ([[Postman Collection]])
- [ ] No secrets visible on screen (env files, Postman secrets, PayPal dashboard)
- [ ] Demo-ready checklist signed off by Fabiola on the Render URL

Related: [[Render Deployment Runbook]] · [[CI & Repo Hygiene]]
