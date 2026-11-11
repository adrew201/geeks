import "dotenv/config";
import { Worker } from "bullmq";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing ANTHROPIC_API_KEY in backend .env");
}
import { connection } from "../lib/queues.js";
import { handleClipAnalysis } from "./clipAnalysis.js";
import { handleSkillSummary } from "./skillSummary.js";
import { handleBountyVerification } from "./bountyVerification.js";

new Worker("clip-analysis", handleClipAnalysis, { connection });
new Worker("skill-summary", handleSkillSummary, { connection });
new Worker("bounty-verification", handleBountyVerification, { connection });

new Worker("bounty", async (job) => {
  console.log("bounty job", job.name, job.id);
}, { connection });
