---
type: person
role: UI/UX Lead & User Research
tags: [team]
---

# Nigel

**Owns:** everything in `web/` (React, Vite, Tailwind, AG Grid / AG Charts). Screens: swipe feed, Gamer ID, push-to-pay prompt, bounty screens, and gamer/coach/sponsor dashboards. Designs: [[Wireframes Index]].

## Interfaces with [[Rabasa]]
- Builds against the [[Postman Collection]] (mocks first, real API later).
- Consumes `approvalUrl` from donations and subscriptions → [[Payments Service (PayPal)]], [[Subscriptions]].
- Dashboard charts read `GET /api/v1/gamers/:id/dashboard` → [[Profiles & Dashboard API]].
- Handles errors once, using the shared error shape in [[Platform Skeleton & Config#Error format]].
- ⚠ The wireframes still show the removed pay-to-unlock flow. See [[Open Decisions]].

Back to [[Team Members]].
