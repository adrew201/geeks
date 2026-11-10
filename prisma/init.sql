-- SUPERSEDED (10 Nov 2026): this file describes the OLD schema (UserRole,
-- Wallet/Transaction, Decimal money). The source of truth is
-- prisma/schema.prisma and prisma/migrations/. Do not run this file.
-- ============================================================================
-- Play2Pro - PostgreSQL Database Initialization Script
-- Target: PostgreSQL 15+ (Render Managed Database)
-- Matches: Prisma Schema v1.0 (old)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE "UserRole" AS ENUM ('GAMER_FREE', 'GAMER_PAID', 'COACH', 'SPONSOR', 'ADMIN');
CREATE TYPE "SocialPlatform" AS ENUM ('TIKTOK', 'YOUTUBE', 'TWITCH', 'DISCORD', 'X_TWITTER');
CREATE TYPE "ClipPlatform" AS ENUM ('TIKTOK', 'YOUTUBE', 'TWITCH', 'DIRECT_UPLOAD');
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ClipStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'ARCHIVED', 'REMOVED');
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');
CREATE TYPE "BountyType" AS ENUM ('CHALLENGE', 'TOURNAMENT', 'DARE');
CREATE TYPE "BountyStatus" AS ENUM ('DRAFT', 'OPEN_ESCROWED', 'VERIFYING', 'COMPLETED', 'EXPIRED_VOIDED', 'CANCELLED');
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'AI_VERIFIED', 'AI_REJECTED', 'WINNER_APPROVED', 'DECLINED');
CREATE TYPE "CommunityMemberStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'BANNED');
CREATE TYPE "AdFormat" AS ENUM ('FEED_AD', 'SPONSORED_BOUNTY', 'LEADERBOARD_BANNER', 'PLAYER_SPONSORSHIP');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED');
CREATE TYPE "TransactionType" AS ENUM (
  'DONATION_RECEIVED', 'DONATION_SENT', 'BOUNTY_ESCROW_HOLD',
  'BOUNTY_PAYOUT', 'BOUNTY_COMMISSION', 'AD_REVENUE_SHARE',
  'SUBSCRIPTION_PAYMENT', 'SPONSORSHIP_PAYMENT', 'WITHDRAWAL', 'REFUND'
);
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "ModerationTarget" AS ENUM ('CLIP', 'USER', 'COMMENT', 'BOUNTY');
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'FLAGGED', 'RESOLVED', 'DISMISSED');

-- USERS TABLE
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "username" VARCHAR(100) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255),
    "displayName" VARCHAR(150) NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'GAMER_FREE',
    "adultKycVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "kycVerifiedAt" TIMESTAMP WITH TIME ZONE,
    "paypalPayerId" VARCHAR(100),
    "paypalEmail" VARCHAR(255),
    "bio" TEXT,
    "country" VARCHAR(100),
    "region" VARCHAR(100) DEFAULT 'GLOBAL',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_users_region" ON "users"("region");

-- LINKED ACCOUNTS
CREATE TABLE "linked_accounts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "platform" "SocialPlatform" NOT NULL,
    "platformUserId" VARCHAR(255),
    "handle" VARCHAR(150) NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_user_platform" UNIQUE ("userId", "platform")
);

-- GAMER PROFILES (SKILLS PASSPORT / GAMER ID)
CREATE TABLE "gamer_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "gamerTag" VARCHAR(100) UNIQUE NOT NULL,
    "primaryGame" VARCHAR(100) NOT NULL DEFAULT 'Valorant',
    "secondaryGames" TEXT[] NOT NULL DEFAULT '{}',
    "roles" TEXT[] NOT NULL DEFAULT '{}',
    "currentElo" DOUBLE PRECISION NOT NULL DEFAULT 1200.0,
    "radScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "aiQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "aiSkillSummary" TEXT,
    "calendlyUrl" TEXT,
    "whatsappNumber" VARCHAR(50),
    "visibility" BOOLEAN NOT NULL DEFAULT TRUE,
    "totalBountiesWon" INTEGER NOT NULL DEFAULT 0,
    "totalEndorsements" INTEGER NOT NULL DEFAULT 0,
    "lastEloUpdate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_profiles_game_rad" ON "gamer_profiles"("primaryGame", "radScore" DESC);
CREATE INDEX "idx_profiles_elo" ON "gamer_profiles"("currentElo" DESC);

-- RAD SCORE HISTORY
CREATE TABLE "rad_score_history" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL REFERENCES "gamer_profiles"("id") ON DELETE CASCADE,
    "radScore" DOUBLE PRECISION NOT NULL,
    "eloRating" DOUBLE PRECISION NOT NULL,
    "changeReason" VARCHAR(255) NOT NULL,
    "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_rad_history_profile_time" ON "rad_score_history"("profileId", "recordedAt");

-- ACHIEVEMENTS
CREATE TABLE "achievements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL REFERENCES "gamer_profiles"("id") ON DELETE CASCADE,
    "title" VARCHAR(200) NOT NULL,
    "badgeCode" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "proofUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT TRUE,
    "awardedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_achievements_profile" ON "achievements"("profileId");

-- CLIPS (HIGHLIGHTS)
CREATE TABLE "clips" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "gamerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "externalVideoId" VARCHAR(255),
    "platform" "ClipPlatform" NOT NULL DEFAULT 'DIRECT_UPLOAD',
    "game" VARCHAR(100) NOT NULL DEFAULT 'Valorant',
    "durationSeconds" INTEGER,
    "aiAnalysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "aiGameDetected" VARCHAR(100),
    "aiKeyMoments" JSONB,
    "aiTags" TEXT[] NOT NULL DEFAULT '{}',
    "aiQualityScore" DOUBLE PRECISION DEFAULT 0.0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "eloRating" DOUBLE PRECISION NOT NULL DEFAULT 1200.0,
    "radScoreContribution" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "ClipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_clips_game_status_elo" ON "clips"("game", "status", "eloRating" DESC);
CREATE INDEX "idx_clips_gamer" ON "clips"("gamerId");

-- SWIPE VOTES
CREATE TABLE "swipe_votes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "voterId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "clipId" UUID NOT NULL REFERENCES "clips"("id") ON DELETE CASCADE,
    "voteType" "VoteType" NOT NULL,
    "voterWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "previousElo" DOUBLE PRECISION,
    "newElo" DOUBLE PRECISION,
    "ipHash" VARCHAR(128),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_vote_voter_clip" UNIQUE ("voterId", "clipId")
);
CREATE INDEX "idx_votes_clip_time" ON "swipe_votes"("clipId", "createdAt");

-- BOUNTIES
CREATE TABLE "bounties" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "creatorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "game" VARCHAR(100) NOT NULL,
    "bountyType" "BountyType" NOT NULL DEFAULT 'CHALLENGE',
    "rewardAmount" NUMERIC(12, 2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "platformCommissionRate" NUMERIC(5, 4) NOT NULL DEFAULT 0.1000,
    "deadline" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" "BountyStatus" NOT NULL DEFAULT 'DRAFT',
    "paypalOrderId" VARCHAR(100) UNIQUE,
    "paypalAuthorizationId" VARCHAR(100) UNIQUE,
    "paypalCaptureId" VARCHAR(100) UNIQUE,
    "winnerId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "communityId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_bounties_game_status_deadline" ON "bounties"("game", "status", "deadline");
CREATE INDEX "idx_bounties_creator" ON "bounties"("creatorId");

-- BOUNTY SUBMISSIONS
CREATE TABLE "bounty_submissions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bountyId" UUID NOT NULL REFERENCES "bounties"("id") ON DELETE CASCADE,
    "gamerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "clipId" UUID NOT NULL REFERENCES "clips"("id") ON DELETE CASCADE,
    "aiVerificationStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "aiConfidenceScore" DOUBLE PRECISION,
    "aiReviewNotes" TEXT,
    "creatorConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "uq_bounty_gamer_submission" UNIQUE ("bountyId", "gamerId")
);
CREATE INDEX "idx_submissions_bounty_status" ON "bounty_submissions"("bountyId", "status");

-- COMMUNITIES
CREATE TABLE "communities" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "coachId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) UNIQUE NOT NULL,
    "description" TEXT,
    "game" VARCHAR(100) NOT NULL,
    "logoUrl" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "isPrivate" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_communities_coach" ON "communities"("coachId");
CREATE INDEX "idx_communities_game" ON "communities"("game");

ALTER TABLE "bounties" ADD CONSTRAINT "fk_bounties_community" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL;

-- COMMUNITY MEMBERS
CREATE TABLE "community_members" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "communityId" UUID NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
    "gamerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "status" "CommunityMemberStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_community_gamer" UNIQUE ("communityId", "gamerId")
);
CREATE INDEX "idx_members_gamer_status" ON "community_members"("gamerId", "status");

-- COACH ENDORSEMENTS
CREATE TABLE "coach_endorsements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "coachId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "gamerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "comment" TEXT NOT NULL,
    "weightMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_coach_gamer_endorsement" UNIQUE ("coachId", "gamerId")
);
CREATE INDEX "idx_endorsements_gamer" ON "coach_endorsements"("gamerId");

-- AD CAMPAIGNS
CREATE TABLE "ad_campaigns" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sponsorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "campaignName" VARCHAR(200) NOT NULL,
    "format" "AdFormat" NOT NULL DEFAULT 'FEED_AD',
    "budgetTotal" NUMERIC(12, 2) NOT NULL,
    "budgetRemaining" NUMERIC(12, 2) NOT NULL,
    "costPerThousandViews" NUMERIC(10, 2),
    "targetGame" VARCHAR(100),
    "targetRegion" VARCHAR(100) DEFAULT 'GLOBAL',
    "targetAgeBand" VARCHAR(50),
    "creativeVideoUrl" TEXT NOT NULL,
    "clickThroughUrl" TEXT,
    "impressionsCount" INTEGER NOT NULL DEFAULT 0,
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "paypalOrderId" VARCHAR(100) UNIQUE,
    "startDate" TIMESTAMP WITH TIME ZONE,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_campaigns_lookup" ON "ad_campaigns"("status", "targetGame", "targetRegion");

-- AD IMPRESSIONS
CREATE TABLE "ad_impressions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
    "viewerId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "clipId" UUID REFERENCES "clips"("id") ON DELETE SET NULL,
    "gamerId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "revShareAmount" NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    "viewedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_ad_impressions_campaign" ON "ad_impressions"("campaignId", "viewedAt");
CREATE INDEX "idx_ad_impressions_gamer" ON "ad_impressions"("gamerId", "viewedAt");

-- PLAYER SPONSORSHIP DEALS
CREATE TABLE "player_sponsorship_deals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sponsorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "gamerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "dealTerms" TEXT NOT NULL,
    "monthlyFee" NUMERIC(12, 2) NOT NULL,
    "platformFee" NUMERIC(12, 2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WALLETS
CREATE TABLE "wallets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "balance" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "pendingBalance" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "totalEarned" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "totalWithdrawn" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS
CREATE TABLE "transactions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "walletId" UUID NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
    "type" "TransactionType" NOT NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "feeAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "netAmount" NUMERIC(12, 2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paypalTransactionId" VARCHAR(100) UNIQUE,
    "paypalOrderId" VARCHAR(100),
    "paypalPayoutBatchId" VARCHAR(100),
    "paypalPayoutItemId" VARCHAR(100),
    "description" TEXT,
    "metadata" JSONB,
    "bountyId" UUID REFERENCES "bounties"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_transactions_wallet_time" ON "transactions"("walletId", "createdAt");
CREATE INDEX "idx_transactions_paypal_order" ON "transactions"("paypalOrderId");
CREATE INDEX "idx_transactions_status" ON "transactions"("status");

-- DONATIONS
CREATE TABLE "donations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "donorId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "recipientGamerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "clipId" UUID REFERENCES "clips"("id") ON DELETE SET NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "fee" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "netAmount" NUMERIC(12, 2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "paypalOrderId" VARCHAR(100) UNIQUE,
    "message" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_donations_recipient_time" ON "donations"("recipientGamerId", "createdAt");

-- SUBSCRIPTIONS
CREATE TABLE "subscriptions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "planTier" "UserRole" NOT NULL,
    "paypalSubscriptionId" VARCHAR(100) UNIQUE NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
    "currentPeriodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_subscriptions_user_status" ON "subscriptions"("userId", "status");

-- MODERATION LOGS
CREATE TABLE "moderation_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "targetType" "ModerationTarget" NOT NULL,
    "targetId" UUID NOT NULL,
    "reportedById" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "flagReason" VARCHAR(255) NOT NULL,
    "aiConfidence" DOUBLE PRECISION,
    "resolutionNotes" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP WITH TIME ZONE
);
CREATE INDEX "idx_mod_status_target" ON "moderation_logs"("status", "targetType");

-- PAYPAL WEBHOOK AUDIT
CREATE TABLE "paypal_webhook_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "eventId" VARCHAR(150) UNIQUE NOT NULL,
    "eventType" VARCHAR(150) NOT NULL,
    "resourceType" VARCHAR(100) NOT NULL,
    "summary" TEXT,
    "rawPayload" JSONB NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PROCESSED',
    "signatureValid" BOOLEAN NOT NULL DEFAULT TRUE,
    "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_webhook_type_time" ON "paypal_webhook_events"("eventType", "receivedAt");
