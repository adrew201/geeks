---
type: workstream
owner: Rabasa
day: Sun 8 Nov, then nightly
status: todo
priority: P1
tags: [rabasa, postman, api]
---

# Postman Collection

Rabasa owns `postman/Play2Pro.postman_collection.json` and the sandbox environment. Teammates add requests in the shared Postman workspace, and Rabasa **exports once per evening**. [[Fabiola]] owns `postman/tests/`. [[Nigel]] builds against the mock server. Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §20.2

## Folder structure
```text
Play2Pro
├── 00 Health
├── 01 Auth            signup ×3 roles, login (test script saves {{token_gamer}}, {{token_coach}}, {{token_sponsor}})
├── 02 Profiles        GET gamer, GET dashboard as owner / coach / sponsor / stranger
├── 03 Communities     create, list, join, list requests, approve, decline
├── 04 Donations       create → open {{approvalUrl}} → capture
├── 05 Subscriptions   create Paid Gamer / Coach, me, cancel
├── 06 Wallet          get wallet, withdraw, withdraw > balance (expect 422)
├── 07 Clips / Feed / Votes / Bounties / Ads / Coach   (Obonyo adds these)
├── 08 Leaderboard     (Fabiola)
├── 09 Webhooks        Simulate: CAPTURE.COMPLETED, SUBSCRIPTION.ACTIVATED, PAYOUTS-ITEM.FAILED, forged signature (expect 400)
└── 99 PayPal direct   OAuth token, create product, create plans, get order, get subscription
```

## Environments
- `local`: `{{baseUrl}} = http://localhost:3000`
- `render`: `{{baseUrl}} = https://<api>.onrender.com`
- Shared secrets (sandbox client ID/secret, sandbox account emails/passwords) live **only** in the Postman environment, never in Git (README §9.2)

## "Simulate webhook" (demo fallback)
A real PayPal signature can't be forged, so pick one of these for the replay request:
- (a) replay a **captured real sandbox event** with its original `paypal-transmission-*` headers. *Untested:* check whether PayPal's verify endpoint still accepts an old transmission. Dedupe makes a second replay of the same event a no-op, so capture a fresh event per demo flow. Or:
- (b) a dev-only `POST /api/v1/webhooks/paypal/simulate` behind `NODE_ENV !== 'production'` **and** an admin token. Agree with [[Gicharu]]; it must never ship enabled.

## Done when
- [ ] Nigel can build every Rabasa screen from saved example responses
- [ ] Fabiola's Newman run covers donation, subscription, bounty and withdraw in sandbox
- [ ] Exported JSON committed every evening at the 11 pm sync

Related: [[Payments Service (PayPal)]] · [[Webhook Handlers]] · [[Auth, Roles & Tiers]]
