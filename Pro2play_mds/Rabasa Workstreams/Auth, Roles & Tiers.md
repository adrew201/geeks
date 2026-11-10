---
type: workstream
owner: Rabasa
day: Sat 7 Nov
status: todo
priority: P0
tags: [rabasa, auth, jwt]
---

# Auth, Roles & Tiers

`src/plugins/auth/`. Guards themselves are [[Gicharu]]'s; Rabasa provides the identity they read. Up: [[Rabasa Workstreams Index]] · Handbook: [[Specs/README|README]] §18 · Spec: [[Play2Pro Turning Casual Gamers into Professionals]] §1

## Contract

| Route | Body | Response |
| --- | --- | --- |
| `POST /auth/signup` | `{ email, password, displayName, role: "GAMER" \| "COACH" \| "SPONSOR" }` | `201 { token, user: { id, role, tier: "FREE" } }` |
| `POST /auth/login` | `{ email, password }` | `200 { token, user }` |
| `GET /auth/me` *(proposed; Nigel needs it after a reload)* | — | `200 { user }`, with `tier` re-read from the DB |

JWT payload: `{ sub: userId, role, tier }`, expiring per `JWT_EXPIRES_IN` (7d).

## Rules
- **Tier always starts FREE.** It only becomes PAID through a verified `BILLING.SUBSCRIPTION.ACTIVATED` webhook ([[Subscriptions]]). Never accept `tier` from the client.
- **Re-read `tier` (and `isVerifiedAdult`) from the DB on sensitive routes.** Tokens go stale when a webhook flips the tier.
- A GAMER signup also creates an empty `GamerProfile` with a generated `gamerTag` (wireframes show the `P2P-00842` format). Do both writes in one transaction.
- Hash passwords with `argon2` or `bcrypt` (cost ≥ 10). Never log auth request bodies.
- Normalise email to lowercase. Return 409 `CONFLICT` on a duplicate.
- Login failure returns a generic 401 `UNAUTHENTICATED` and doesn't reveal whether the email exists.
- `ADMIN` cannot be self-assigned through signup.

## Role × capability matrix (what guards enforce)

| Capability | GAMER FREE | GAMER PAID | COACH (PAID) | SPONSOR |
| --- | --- | --- | --- | --- |
| Sees feed ads | ✅ | ❌ | ❌ | ✅ |
| Upload clips / vote | ✅ / ✅ | ✅ / ✅ | — / ✅ (heavier weight) | — / ✅ |
| Full own dashboard + wallet | ✅ (basic) | ✅ (full analytics) | — | — |
| View others' dashboards | ❌ | ❌ | ✅ read-only | summary only |
| Create community | ❌ | ❌ | ✅ | ❌ |
| Create bounty | ❌ | ❌ | ✅ (verified adult) | ✅ (verified adult) |
| Withdraw / enter bounty / receive donations | verified adult | verified adult | — | — |
| Donation fee | `DONATION_FEE_BPS` | `DONATION_FEE_BPS_PAID_GAMER` | — | — |

## Tasks
- [ ] `auth/service.ts`: `signup()`, `login()`, `issueToken(user)`
- [ ] `auth/routes.ts` with JSON schemas (email format, password min length 8, role enum)
- [ ] Decorate `app.authenticate` (or export it to Gicharu's `requireAuth`) using `@fastify/jwt`
- [ ] Agree the `request.user` type in `src/types/fastify.d.ts` with Gicharu
- [ ] Postman: signup/login for each role, with the token saved to an environment variable → [[Postman Collection]]

## Done when
- Each role can sign up and log in, and the token works on a guarded route
- A FREE user upgraded by webhook gets PAID behaviour without logging in again
- Demo checklist: "Sign up as Gamer, Coach and Sponsor; tiers show the right ads"

Related: [[Schema Reconciliation]] · [[Gicharu]] · [[Wireframes Index]] (screens 02–04)
