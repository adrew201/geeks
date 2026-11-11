import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const connection = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
export const clipAnalysisQueue = new Queue("clip-analysis", { connection });
export const skillSummaryQueue = new Queue("skill-summary", { connection });
export const bountyVerificationQueue = new Queue("bounty-verification", { connection });
export const bountyQueue = new Queue("bounty", { connection });
