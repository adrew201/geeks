**Rabasa**

- [ ] Create the repo: Fastify + TypeScript, ESLint, `.env.example`, folder per plugin
- [ ] Write the Prisma schema with Obonyo (section 5) and run the first migration on local Postgres
- [ ] Auth: sign-up and login (JWT), `role` (GAMER, COACH, SPONSOR) and `tier` (FREE, PAID) on User
- [ ] Create PayPal sandbox app; store client ID and secret; get an access token from Fastify
-**Rabasa**

- [ ] Payments service: `createOrder()` (CAPTURE) for donations, `authorizeOrder()`, `captureOrder()`, `voidAuthorization()` for bounties
- [ ] `POST /api/v1/donations`: create order, return approval link (push-to-pay)
- [ ] Wallet ledger table: every credit and debit written in one transaction
- [ ] Subscriptions: create Paid Gamer and Coach plans in sandbox; `POST /api/v1/subscriptions`; flip `tier` to PAID on webhook
- [ ] Postman collection with sandbox environment shared with the team
-**Rabasa**

- [ ] Communities: create, request to join, approve or decline, members' dashboards for the coach
- [ ] Deploy to Render: web service, managed Postgres, Redis, worker; run migrations and seed
- [ ] Point PayPal sandbox webhooks at the Render URL

