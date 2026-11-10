---
type: workstream
owner: Rabasa
day: Tue 10 Nov
status: todo
priority: P1
tags: [rabasa, communities, coach]
---

# Communities

`src/plugins/communities/`. Coach cohorts: a gamer requests to join and the coach approves or declines. **Cut list #3:** anything beyond create + request + approve is cut first. Up: [[Rabasa Workstreams Index]] · Spec: [[Play2Pro Turning Casual Gamers into Professionals]] §1 "Coach communities"

## Endpoints (from the plan) + minimal additions

| Route | Guard | Behaviour |
| --- | --- | --- |
| `POST /api/v1/communities` `{ name, description?, isPrivate? }` | COACH | 201 with the community |
| `GET /api/v1/communities` *(add)* | any user | Browse list (gamers need it to request) |
| `GET /api/v1/communities/:id` *(add)* | any user | Detail + approved members + member leaderboard (sorted by `radScore`) |
| `POST /api/v1/communities/:id/join` | GAMER | Creates `PENDING`; 409 if a request already exists; re-request allowed after `DECLINED` |
| `GET /api/v1/communities/:id/requests` *(add)* | that community's coach | Pending list |
| `POST /api/v1/communities/:id/requests/:requestId` `{ decision }` | that community's coach | `APPROVE` / `DECLINE`; sets `decidedAt`; 409 if already decided |
| `GET /api/v1/communities/:id/dashboards` *(stretch)* | coach | Members' dashboard summaries side by side (reuses [[Profiles & Dashboard API]]) |

Ownership check: `community.coachId === request.user.id`, otherwise 403 `FORBIDDEN_ROLE`. Do this in the service, not just the guard.

## Effects on other features
- An approved membership shows on the Gamer ID (a credibility signal) → [[Profiles & Dashboard API]]
- Community-only bounties: `Bounty.communityId?` is [[Obonyo]]'s field. Rabasa exports `isMember(communityId, userId)` for the entry check.
- **Open question (spec):** free to join, or a coach membership fee via PayPal? Out of scope for the demo → [[Open Decisions]]

## Done when
- [ ] Demo step 6: the coach approves a gamer's join request, and the gamer's profile shows the community
- [ ] Seed ([[Fabiola]]) includes 1 community with 1 pending request so the demo is quick

Related: [[Auth, Roles & Tiers]] · Coach AI talent matching (`GET /coach/matches`) belongs to [[Obonyo]], not this plugin
