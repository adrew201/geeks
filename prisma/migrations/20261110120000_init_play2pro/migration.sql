-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GAMER', 'COACH', 'SPONSOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TIKTOK', 'YOUTUBE', 'TWITCH', 'DISCORD', 'X_TWITTER');

-- CreateEnum
CREATE TYPE "ClipPlatform" AS ENUM ('TIKTOK', 'YOUTUBE', 'TWITCH', 'DIRECT_UPLOAD');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ClipStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'ARCHIVED', 'REMOVED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateEnum
CREATE TYPE "BountyType" AS ENUM ('CHALLENGE', 'TOURNAMENT', 'DARE');

-- CreateEnum
CREATE TYPE "BountyStatus" AS ENUM ('DRAFT', 'OPEN_ESCROWED', 'VERIFYING', 'COMPLETED', 'EXPIRED_VOIDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'AI_VERIFIED', 'AI_REJECTED', 'WINNER_APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "CommunityMemberStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'BANNED');

-- CreateEnum
CREATE TYPE "AdFormat" AS ENUM ('FEED_AD', 'SPONSORED_BOUNTY', 'LEADERBOARD_BANNER', 'PLAYER_SPONSORSHIP');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('PAID_GAMER', 'COACH');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('APPROVAL_PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WalletEntryKind" AS ENUM ('DONATION', 'BOUNTY', 'AD_SHARE', 'FEE', 'WITHDRAWAL', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModerationTarget" AS ENUM ('CLIP', 'USER', 'COMMENT', 'BOUNTY');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'FLAGGED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'GAMER',
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "isVerifiedAdult" BOOLEAN NOT NULL DEFAULT false,
    "kycVerifiedAt" TIMESTAMP(3),
    "paypalPayerId" TEXT,
    "paypalEmail" TEXT,
    "bio" TEXT,
    "country" TEXT,
    "region" TEXT DEFAULT 'GLOBAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linked_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformUserId" TEXT,
    "handle" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamer_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gamerTag" TEXT NOT NULL,
    "primaryGame" TEXT NOT NULL DEFAULT 'Valorant',
    "secondaryGames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentElo" DOUBLE PRECISION NOT NULL DEFAULT 1200.0,
    "radScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "aiQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "aiSkillSummary" TEXT,
    "calendlyUrl" TEXT,
    "whatsappNumber" TEXT,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "totalBountiesWon" INTEGER NOT NULL DEFAULT 0,
    "totalEndorsements" INTEGER NOT NULL DEFAULT 0,
    "lastEloUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rad_score_history" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "radScore" DOUBLE PRECISION NOT NULL,
    "eloRating" DOUBLE PRECISION NOT NULL,
    "changeReason" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rad_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "badgeCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "proofUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clips" (
    "id" UUID NOT NULL,
    "gamerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "externalVideoId" TEXT,
    "platform" "ClipPlatform" NOT NULL DEFAULT 'DIRECT_UPLOAD',
    "game" TEXT NOT NULL DEFAULT 'Valorant',
    "durationSeconds" INTEGER,
    "aiAnalysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "aiGameDetected" TEXT,
    "aiKeyMoments" JSONB,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiQualityScore" DOUBLE PRECISION DEFAULT 0.0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "eloRating" DOUBLE PRECISION NOT NULL DEFAULT 1200.0,
    "radScoreContribution" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "ClipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swipe_votes" (
    "id" UUID NOT NULL,
    "voterId" UUID NOT NULL,
    "clipId" UUID NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "voterWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "previousElo" DOUBLE PRECISION,
    "newElo" DOUBLE PRECISION,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swipe_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounties" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "bountyType" "BountyType" NOT NULL DEFAULT 'CHALLENGE',
    "rewardAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "platformCommissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "BountyStatus" NOT NULL DEFAULT 'DRAFT',
    "paypalOrderId" TEXT,
    "paypalAuthorizationId" TEXT,
    "paypalCaptureId" TEXT,
    "winnerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "communityId" UUID,

    CONSTRAINT "bounties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounty_submissions" (
    "id" UUID NOT NULL,
    "bountyId" UUID NOT NULL,
    "gamerId" UUID NOT NULL,
    "clipId" UUID NOT NULL,
    "aiVerificationStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "aiConfidenceScore" DOUBLE PRECISION,
    "aiReviewNotes" TEXT,
    "creatorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "bounty_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "game" TEXT NOT NULL,
    "logoUrl" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "gamerId" UUID NOT NULL,
    "status" "CommunityMemberStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_endorsements" (
    "id" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "gamerId" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "weightMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" UUID NOT NULL,
    "sponsorId" UUID NOT NULL,
    "campaignName" TEXT NOT NULL,
    "format" "AdFormat" NOT NULL DEFAULT 'FEED_AD',
    "budgetTotal" DECIMAL(12,2) NOT NULL,
    "budgetRemaining" DECIMAL(12,2) NOT NULL,
    "costPerThousandViews" DECIMAL(10,2),
    "targetGame" TEXT,
    "targetRegion" TEXT DEFAULT 'GLOBAL',
    "targetAgeBand" TEXT,
    "creativeVideoUrl" TEXT NOT NULL,
    "clickThroughUrl" TEXT,
    "impressionsCount" INTEGER NOT NULL DEFAULT 0,
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "paypalOrderId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_impressions" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "viewerId" UUID,
    "clipId" UUID,
    "gamerId" UUID,
    "revShareAmount" DECIMAL(10,4) NOT NULL DEFAULT 0.00,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_sponsorship_deals" (
    "id" UUID NOT NULL,
    "sponsorId" UUID NOT NULL,
    "gamerId" UUID NOT NULL,
    "dealTerms" TEXT NOT NULL,
    "monthlyFee" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_sponsorship_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "kind" "WalletEntryKind" NOT NULL,
    "paypalRef" TEXT,
    "donationId" UUID,
    "bountyId" UUID,
    "payoutStatus" "PayoutStatus",
    "payoutBatchId" TEXT,
    "payoutItemId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL,
    "donorId" UUID,
    "recipientGamerId" UUID NOT NULL,
    "clipId" UUID,
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "paypalSubscriptionId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'APPROVAL_PENDING',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" UUID NOT NULL,
    "targetType" "ModerationTarget" NOT NULL,
    "targetId" UUID NOT NULL,
    "reportedById" UUID,
    "flagReason" TEXT NOT NULL,
    "aiConfidence" DOUBLE PRECISION,
    "resolutionNotes" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paypal_webhook_events" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "summary" TEXT,
    "rawPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "signatureValid" BOOLEAN NOT NULL DEFAULT true,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paypal_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_tier_idx" ON "users"("role", "tier");

-- CreateIndex
CREATE INDEX "users_region_idx" ON "users"("region");

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_userId_platform_key" ON "linked_accounts"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "gamer_profiles_userId_key" ON "gamer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gamer_profiles_gamerTag_key" ON "gamer_profiles"("gamerTag");

-- CreateIndex
CREATE INDEX "gamer_profiles_primaryGame_radScore_idx" ON "gamer_profiles"("primaryGame", "radScore" DESC);

-- CreateIndex
CREATE INDEX "gamer_profiles_currentElo_idx" ON "gamer_profiles"("currentElo" DESC);

-- CreateIndex
CREATE INDEX "rad_score_history_profileId_recordedAt_idx" ON "rad_score_history"("profileId", "recordedAt");

-- CreateIndex
CREATE INDEX "achievements_profileId_idx" ON "achievements"("profileId");

-- CreateIndex
CREATE INDEX "clips_game_status_eloRating_idx" ON "clips"("game", "status", "eloRating" DESC);

-- CreateIndex
CREATE INDEX "clips_gamerId_idx" ON "clips"("gamerId");

-- CreateIndex
CREATE INDEX "swipe_votes_clipId_createdAt_idx" ON "swipe_votes"("clipId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "swipe_votes_voterId_clipId_key" ON "swipe_votes"("voterId", "clipId");

-- CreateIndex
CREATE UNIQUE INDEX "bounties_paypalOrderId_key" ON "bounties"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "bounties_paypalAuthorizationId_key" ON "bounties"("paypalAuthorizationId");

-- CreateIndex
CREATE UNIQUE INDEX "bounties_paypalCaptureId_key" ON "bounties"("paypalCaptureId");

-- CreateIndex
CREATE INDEX "bounties_game_status_deadline_idx" ON "bounties"("game", "status", "deadline");

-- CreateIndex
CREATE INDEX "bounties_creatorId_idx" ON "bounties"("creatorId");

-- CreateIndex
CREATE INDEX "bounty_submissions_bountyId_status_idx" ON "bounty_submissions"("bountyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bounty_submissions_bountyId_gamerId_key" ON "bounty_submissions"("bountyId", "gamerId");

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- CreateIndex
CREATE INDEX "communities_coachId_idx" ON "communities"("coachId");

-- CreateIndex
CREATE INDEX "communities_game_idx" ON "communities"("game");

-- CreateIndex
CREATE INDEX "community_members_gamerId_status_idx" ON "community_members"("gamerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_communityId_gamerId_key" ON "community_members"("communityId", "gamerId");

-- CreateIndex
CREATE INDEX "coach_endorsements_gamerId_idx" ON "coach_endorsements"("gamerId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_endorsements_coachId_gamerId_key" ON "coach_endorsements"("coachId", "gamerId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_paypalOrderId_key" ON "ad_campaigns"("paypalOrderId");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_targetGame_targetRegion_idx" ON "ad_campaigns"("status", "targetGame", "targetRegion");

-- CreateIndex
CREATE INDEX "ad_impressions_campaignId_viewedAt_idx" ON "ad_impressions"("campaignId", "viewedAt");

-- CreateIndex
CREATE INDEX "ad_impressions_gamerId_viewedAt_idx" ON "ad_impressions"("gamerId", "viewedAt");

-- CreateIndex
CREATE INDEX "player_sponsorship_deals_sponsorId_idx" ON "player_sponsorship_deals"("sponsorId");

-- CreateIndex
CREATE INDEX "player_sponsorship_deals_gamerId_idx" ON "player_sponsorship_deals"("gamerId");

-- CreateIndex
CREATE INDEX "wallet_entries_userId_createdAt_idx" ON "wallet_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_entries_payoutItemId_idx" ON "wallet_entries"("payoutItemId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_entries_paypalRef_kind_key" ON "wallet_entries"("paypalRef", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "donations_paypalOrderId_key" ON "donations"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "donations_paypalCaptureId_key" ON "donations"("paypalCaptureId");

-- CreateIndex
CREATE INDEX "donations_recipientGamerId_createdAt_idx" ON "donations"("recipientGamerId", "createdAt");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paypalSubscriptionId_key" ON "subscriptions"("paypalSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX "moderation_logs_status_targetType_idx" ON "moderation_logs"("status", "targetType");

-- CreateIndex
CREATE UNIQUE INDEX "paypal_webhook_events_eventId_key" ON "paypal_webhook_events"("eventId");

-- CreateIndex
CREATE INDEX "paypal_webhook_events_eventType_receivedAt_idx" ON "paypal_webhook_events"("eventType", "receivedAt");

-- AddForeignKey
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamer_profiles" ADD CONSTRAINT "gamer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rad_score_history" ADD CONSTRAINT "rad_score_history_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "gamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "gamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_gamerId_fkey" FOREIGN KEY ("gamerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipe_votes" ADD CONSTRAINT "swipe_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipe_votes" ADD CONSTRAINT "swipe_votes_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_submissions" ADD CONSTRAINT "bounty_submissions_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "bounties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_submissions" ADD CONSTRAINT "bounty_submissions_gamerId_fkey" FOREIGN KEY ("gamerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_submissions" ADD CONSTRAINT "bounty_submissions_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_gamerId_fkey" FOREIGN KEY ("gamerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_endorsements" ADD CONSTRAINT "coach_endorsements_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_endorsements" ADD CONSTRAINT "coach_endorsements_gamerId_fkey" FOREIGN KEY ("gamerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_gamerId_fkey" FOREIGN KEY ("gamerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_sponsorship_deals" ADD CONSTRAINT "player_sponsorship_deals_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_sponsorship_deals" ADD CONSTRAINT "player_sponsorship_deals_gamerId_fkey" FOREIGN KEY ("gamerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "bounties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_recipientGamerId_fkey" FOREIGN KEY ("recipientGamerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

