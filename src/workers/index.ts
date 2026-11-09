import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../lib/queues.js";

new Worker("clip-analysis", async (job) => {
  console.log("clip-analysis job", job.id, job.data);
}, { connection });

new Worker("bounty", async (job) => {
  console.log("bounty job", job.name, job.id);
}, { connection });
