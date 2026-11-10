---
type: workstream
owner: Rabasa
day: Sun 8 Nov
status: todo
priority: P1
tags: [rabasa, paypal, subscriptions, tiers]
---

# Subscriptions

PayPal Subscriptions for **Paid Gamer** and **Coach** plans. They drive `User.tier`. Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §9.3, §15.2 · Spec: [[Play2Pro Turning Casual Gamers into Professionals]] §1

## Sandbox setup (do once)
- [ ] Create one Product "Play2Pro": `POST /v1/catalogs/products` (`type: SERVICE`)
- [ ] Create two monthly Plans with `POST /v1/billing/plans` → copy the IDs to `PAYPAL_PLAN_ID_PAID_GAMER` and `PAYPAL_PLAN_ID_COACH`
- [ ] Save both requests in the [[Postman Collection]] so plans can be recreated
- [ ] Prices are a team decision. Placeholder: Paid Gamer $4.99/mo, Coach $19.99/mo → [[Open Decisions]]

## Flow
1. `POST /api/v1/subscriptions { plan: "PAID_GAMER" | "COACH" }`. Guard: GAMER may only pick PAID_GAMER; COACH may only pick COACH.
2. `payments.createSubscription()` → insert `Subscription { status: APPROVAL_PENDING, paypalSubscriptionId }` → return `{ approvalUrl, subscriptionId }`.
3. The user approves in PayPal and returns to `WEB_ORIGIN/subscribe/return`.
4. [[Webhook Handlers]]:
   - `BILLING.SUBSCRIPTION.ACTIVATED` → `status = ACTIVE`, `user.tier = PAID` (one transaction)
   - `BILLING.SUBSCRIPTION.CANCELLED` / `.EXPIRED` / `.SUSPENDED` → status updated, `user.tier = FREE` **unless another ACTIVE subscription exists**
5. Ads disappear for PAID users because Obonyo's `GET /ads/next` re-reads tier from the DB.

## Extra endpoints (proposed, cheap)
- `GET /api/v1/subscriptions/me`: current plan and status (Nigel's settings page)
- `POST /api/v1/subscriptions/me/cancel` → `payments.cancelSubscription()`. Tier flips on the webhook, not immediately.

## Edge cases
- A user subscribes twice: reject if an ACTIVE or APPROVAL_PENDING one exists (409)
- Map the webhook's `resource.id` to the local row via `paypalSubscriptionId`; `custom_id = userId` is the backup
- Coaches: the spec says the Coach tier is paid. If a coach hasn't subscribed, are coach features blocked? For the demo, the seeded coach is PAID. Logged in [[Open Decisions]].
- Webhook delay during the demo: the Postman "simulate webhook" request, or `GET /v1/billing/subscriptions/{id}` polling on return

## Done when
- [ ] Demo: "Subscription upgrade flips the user to PAID and removes ads"
- [ ] Cancel → tier returns to FREE → ads return

Related: [[Auth, Roles & Tiers]] · [[Payments Service (PayPal)]] · [[Webhook Handlers]]
