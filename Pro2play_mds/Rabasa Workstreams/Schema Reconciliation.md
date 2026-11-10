---
type: workstream
owner: Rabasa
day: Sat 7 Nov
status: todo
priority: P0
blocks: [Fabiola seed, Obonyo models, all endpoints]
tags: [rabasa, prisma, database]
---

# Schema Reconciliation

Rabasa writes `prisma/schema.prisma` and owns **User, GamerProfile, WalletEntry, Subscription, Community, CommunityMember**. After the first migration, only a model's owner changes it. Up: [[Rabasa Workstreams Index]] · Spec: [[Database]] · Plan §5: [[Play2Pro Implementation Plan (7–11 Nov)]]

## The problem: the committed schema contradicts the plan

The current `prisma/schema.prisma` (659 lines, written from the [[Database]] note) doesn't match the plan, README or repo `docs/instructions.md`. Code written against the README would break against it.

| Topic | Committed schema | Plan / README (wins per the README rule) | Recommended fix |
| --- | --- | --- | --- |
| Roles vs. tiers | `enum UserRole { GAMER_FREE, GAMER_PAID, COACH, SPONSOR, ADMIN }`, no `tier` | `role` (GAMER, COACH, SPONSOR) + separate `tier` (FREE, PAID) | Split into `Role` + `Tier` enums. A coach is PAID via subscription, so tier can't be part of the role. Keep `ADMIN` only if used. |
| Adult flag | `adultKycVerified` | `isVerifiedAdult` | Rename to `isVerifiedAdult` (guards and seed use that name) |
| Ledger | `Wallet` (mutable `balance`, `pendingBalance`, totals) + `Transaction` | Append-only `WalletEntry`; balance = `SUM(amount)` | Replace with `WalletEntry`. A mutable balance double-counts on webhook replays. |
| Money type | `Decimal(12,2)` | Integer minor units (cents) in `Int` | Use `Int` cents. Convert to a PayPal `"12.34"` string only inside `payments/service.ts`. |
| Idempotency key | `paypalTransactionId @unique` on Transaction | `paypalRef @unique` on WalletEntry | `paypalRef String? @unique`, plus a composite to allow FEE rows (see below) |
| Votes | `SwipeVote` | `Vote` (clipId, voterId, direction, weight) | Obonyo's call; flag it to them |
| Endorsement | `CoachEndorsement` | `Endorsement` | Fabiola's call |
| Webhook log | `PaypalWebhookEvent` | `WebhookEvent { paypalEventId @unique }` | Gicharu's call; either name works if documented |
| Extra models | `PlayerSponsorshipDeal`, `ModerationLog`, `AdCampaign`, `Donation`, `LinkedAccount`, `Achievement`, `RadScoreHistory` | Not in the plan's model list | Keep `RadScoreHistory` (dashboards need it) and `Achievement` (bounty wins). Keep the rest only if they cost nothing; they add migration surface. |

> [!note] Two ledger rows per PayPal event
> A donation writes `+amount DONATION` and `-fee FEE` from one capture. Making `paypalRef` unique alone would reject the second row, so use `@@unique([paypalRef, kind])` (or suffix the fee ref, e.g. `<captureId>:fee`).

## Target models (Rabasa-owned)

```prisma
enum Role { GAMER COACH SPONSOR ADMIN }
enum Tier { FREE PAID }
enum WalletEntryKind { DONATION BOUNTY AD_SHARE WITHDRAWAL FEE REVERSAL }
enum SubscriptionPlan { PAID_GAMER COACH }
enum SubscriptionStatus { APPROVAL_PENDING ACTIVE CANCELLED SUSPENDED EXPIRED }
enum MembershipStatus { PENDING APPROVED DECLINED }

model User {
  id              String   @id @default(uuid()) @db.Uuid
  email           String   @unique
  passwordHash    String
  displayName     String
  role            Role
  tier            Tier     @default(FREE)
  paypalPayerId   String?
  paypalEmail     String?            // payout receiver
  isVerifiedAdult Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  profile         GamerProfile?
  walletEntries   WalletEntry[]
  subscriptions   Subscription[]
  // + relations to Obonyo/Fabiola models
}

model GamerProfile {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @db.Uuid
  gamerTag  String   @unique        // public Gamer ID handle, e.g. P2P-00842
  platforms String[]
  games     String[]
  region    String?
  aiSummary String?               // written by Obonyo's skill-summary worker
  radScore  Float    @default(0)  // written by Fabiola's recomputeRadScore
  bookingUrl String?              // Calendly / WhatsApp
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model WalletEntry {
  id        String          @id @default(uuid()) @db.Uuid
  userId    String          @db.Uuid
  amount    Int             // signed cents
  kind      WalletEntryKind
  paypalRef String?
  note      String?
  createdAt DateTime        @default(now())
  user      User            @relation(fields: [userId], references: [id])
  @@unique([paypalRef, kind])
  @@index([userId, createdAt])
}

model Subscription {
  id                   String             @id @default(uuid()) @db.Uuid
  userId               String             @db.Uuid
  plan                 SubscriptionPlan
  paypalSubscriptionId String             @unique
  status               SubscriptionStatus @default(APPROVAL_PENDING)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  user                 User               @relation(fields: [userId], references: [id])
}

model Community {
  id          String   @id @default(uuid()) @db.Uuid
  coachId     String   @db.Uuid
  name        String
  description String?
  isPrivate   Boolean  @default(false)
  createdAt   DateTime @default(now())
  members     CommunityMember[]
}

model CommunityMember {
  id          String           @id @default(uuid()) @db.Uuid
  communityId String           @db.Uuid
  memberId    String           @db.Uuid
  status      MembershipStatus @default(PENDING)
  createdAt   DateTime         @default(now())
  decidedAt   DateTime?
  community   Community        @relation(fields: [communityId], references: [id], onDelete: Cascade)
  @@unique([communityId, memberId])
}
```

Payouts also need a status. Either add `payoutStatus` / `payoutItemId` to the WITHDRAWAL entry, or add a small `Payout` table; see [[Wallet Ledger & Payouts]].

## Tasks
- [ ] Agree the role/tier, money and ledger fixes with [[Obonyo]] (co-author) and post them in the chat
- [ ] Say "migrating" in chat → pull → `npx prisma migrate dev --name init_play2pro` → commit schema **and** `prisma/migrations/` together → push → say "done" (repo `docs/instructions.md` §3)
- [ ] Note `prisma/init.sql` is now redundant once migrations exist. Delete it or mark it as reference-only.
- [ ] Update the [[Database]] spec note if the model names change
- [ ] Prisma 7 (`prisma.config.ts` in the repo): confirm `DATABASE_URL` is read from config, and that `directUrl` / pooled URL are set correctly for Render

## Done when
- `npx prisma migrate dev` succeeds from a clean DB on Windows **and** Linux
- [[Fabiola]]'s `prisma/seed.ts` runs and sets `isVerifiedAdult` on demo accounts
- No `Float` or `Decimal` money columns on Rabasa's models
