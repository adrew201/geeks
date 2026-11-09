import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";

export const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
export const clipAnalysisQueue = new Queue("clip-analysis", { connection });
export const bountyQueue = new Queue("bounty", { connection });
