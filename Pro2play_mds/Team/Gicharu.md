---
type: person
role: Payments Security & Integration
tags: [team]
---

# Gicharu

**Owns:** PayPal webhook signature verification (`src/plugins/webhooks/verify*.ts`), guards (`requireAuth`, `requireRole`, `requireTier`, `requireVerifiedAdult`), the adult-account check, the payments security pass, and `tests/webhooks/`. **Model:** WebhookEvent (idempotency).

## Interfaces with [[Rabasa]]
- Verification and dedupe run **before** Rabasa's [[Webhook Handlers]]. The handler contract is `(event) => Promise<void>`, dispatched by `event_type`.
- Guards wrap Rabasa's routes. See [[Auth, Roles & Tiers]] for the JWT payload the guards read.
- Security pass covers [[Payments Service (PayPal)]] and [[Wallet Ledger & Payouts]] (withdraw requires a verified adult).

Back to [[Team Members]].
