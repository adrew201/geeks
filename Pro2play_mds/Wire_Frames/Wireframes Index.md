---
type: index
tags: [wireframes, design]
---

# Wireframes Index

30 hi-fi dark-theme mockups covering **16 screens**. Desktop frames are 1440 px and mobile frames 390 px. Owner: [[Nigel]]. Back to [[Home]].

> [!warning] The designs predate the scope change
> - **Money flow is the removed coach pay-to-unlock VOD** (screens 12–16, in **KSh**). The plan dropped it. There are no donation / push-to-pay, bounty, escrow, subscription, community, sponsor-ad or withdraw screens. The mobile wallet even says payouts are "not active in this MVP prototype".
> - The vote UI is **3-option** (Impressive / Average / Needs Work), not up/down swipe.
> - Coach and Sponsor share one dashboard; nothing is sponsor-specific.
>
> Suggested reuse: screens 13 → 14 → 15 → 16 (order → PayPal approve → webhook pending → confirmed) are exactly the push-to-pay pattern needed for **donations** and **bounty funding**. See [[Open Decisions]] #5–7.

## Screens

| # | Screen | Role | Desktop | Mobile | Backend owner / endpoints |
| --- | --- | --- | --- | --- | --- |
| 01 | Landing page | Public | ![[9a8b9589-a137-446b-ab93-6ada205a4ef4.png\|120]] | ![[b3a402f4-d55e-4d6d-b1be-123822f16aa8.png\|60]] | Static (optional featured gamer) |
| 02 | Sign up / log in, role select | Any | ![[d6e8d117-f4f3-469a-aa44-67e05c93a997.png\|120]] | ![[95d653fd-8310-4d50-8801-5eca1a819c0d.png\|60]] | [[Auth, Roles & Tiers]]: `POST /auth/signup`, `/auth/login` (forgot/reset password shown but not in scope) |
| 03 | Gamer onboarding (Identity → Games → Details → Review) | Gamer | ![[11b3eb57-ec5b-49e1-8eea-eba98da15733.png\|120]] | ![[fa96b575-8db1-440f-9264-a63f6cd5baa8.png\|60]] | [[Profiles & Dashboard API]]: `PATCH /gamers/me`, gamerTag `P2P-xxxxx` |
| 04 | Coach / sponsor professional setup | Coach, Sponsor | ![[5d22b5ed-5c72-453f-a276-120d726dc70a.png\|120]] | ![[0af76475-8334-4bab-8496-3b0880a18d89.png\|60]] | [[Auth, Roles & Tiers]] (profile fields not in the schema yet) |
| 05 | Gamer dashboard (KPIs, processing pipeline, earnings, activity) | Gamer | ![[a77f0d38-5eb5-42f7-9969-80cbb1086882.png\|120]] | — | [[Profiles & Dashboard API]] `/gamers/:id/dashboard`; clip status from [[Obonyo]] |
| 06 | Skills Passport (AI insight accept/reject, skill bars) | Gamer | — | ![[e172f6a3-5d20-46ec-975b-b30d2529933e.png\|60]] | [[Profiles & Dashboard API]] `GET /gamers/:id`; accept/reject AI insight is extra scope |
| 07 | Clip submission + AI parsing | Gamer | ![[b0fce7f5-2515-4ad7-bcfc-5bfda4b89ef9.png\|120]] | ![[3149a4d6-6bd1-440d-8101-a6689dd36250.png\|60]] | [[Obonyo]]: `POST /api/v1/clips` |
| 08 | Earnings & wallet (KPIs, revenue chart, transactions) | Gamer | ![[b42fd0fb-f182-493e-9c3e-68580e21befe.png\|120]] | ![[c310d932-13c5-41f8-8f8b-b6cd4d3c2d75.png\|60]] | [[Wallet Ledger & Payouts]]: `GET /wallet`, time series by kind. **Needs a Withdraw button added.** |
| 09 | Swipe-to-Rank / Community Arena | Any | ![[103785df-5d72-49b4-984c-c7427129be6c.png\|120]] | ![[e05db526-2ab3-4144-8eb6-7c871fa7ada9.png\|60]] | [[Obonyo]]: `GET /feed`, `POST /clips/:id/vote` |
| 10 | Global leaderboard (AG Grid table + podium) | Any | ![[e4c49151-edee-4864-80b0-103b6bf7b4c5.png\|120]] | ![[c65ed17b-4943-4247-b898-d9e261f21604.png\|60]] | [[Fabiola]]: `GET /leaderboard?game=` |
| 11 | Talent discovery | Coach, Sponsor | ![[fe04a864-4a22-4c13-a07b-2401f27de733.png\|120]] | ![[ad4d638b-b41c-4056-a463-b52081133798.png\|60]] | [[Obonyo]]: `GET /coach/matches` |
| 12 | Candidate profile (coach's view of Gamer ID) | Coach, Sponsor | ![[24580109-17ec-4867-8911-74e9cfa9c433.png\|120]] | ![[95bc39fe-1b52-4115-a806-c5bc0fc7acb8.png\|60]] | [[Profiles & Dashboard API]]. Remove "Unlock Exclusive Footage" and add "Donate" / "Invite to community". |
| 13 | ~~Unlock~~ order modal | Coach | ![[a4a57f8e-f569-4528-9be2-6cd02e10ebcd.png\|120]] | ![[6a397cd1-6e7a-4121-b30a-0fe7370c908c.png\|60]] | Reuse for donation amount → [[Payments Service (PayPal)]] `POST /donations` |
| 14 | PayPal approval + redirect (copy link, share via WhatsApp) | Payer | ![[c32346fc-13aa-476a-b8f4-589d3437a6dd.png\|120]] | ![[ac1c6ecb-bb7e-49ec-949a-9957e0eeb023.png\|60]] | `approvalUrl` from donations / subscriptions / bounties |
| 15 | Pending webhook verification | Payer | ![[d7d69d42-01da-4862-b0cc-62fb6e0e4fe8.png\|120]] | ![[9f16ce6f-a2ae-402b-8126-02f0d2f15a0d.png\|60]] | [[Webhook Handlers]]. Needs a status-poll endpoint (`GET /donations/:orderId`). |
| 16 | Payment confirmed / ~~unlocked VOD~~ | Payer | ![[eca015a5-252c-4282-84a2-50ffb7c97ffc.png\|120]] | ![[fe6f2d81-379c-405a-b5f2-f2b897861f30.png\|60]] | Reuse as the "donation sent" / "bounty funded" confirmation |

## Missing screens for the demo scope
- Subscription upgrade (Paid Gamer / Coach) → [[Subscriptions]]
- Bounty list / create / submit / confirm → [[Obonyo]]
- Coach communities: browse, request, approve → [[Communities]]
- Withdraw dialog → [[Wallet Ledger & Payouts]]
- Feed ad slot for FREE users → [[Obonyo]]
- Sponsor dashboard / campaign view (cut list #2: house ad only)
