import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { askClaude } from "../lib/anthropic.js";
import { stripFences } from "./clipAnalysis.js";

export interface BountyVerificationJob {
  submissionId: string;
}

export interface BountyVerdict {
  pass: boolean;
  confidence: number;
  matchesGame: boolean;
  taskCompleted: boolean;
  looksReused: boolean;
  reason: string;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseVerdict(text: string): BountyVerdict {
  const raw = JSON.parse(stripFences(text)) as Partial<BountyVerdict>;
  if (typeof raw.pass !== "boolean") {
    throw new Error("bounty-verification: missing pass boolean");
  }
  return {
    pass: raw.pass,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
    matchesGame: raw.matchesGame === true,
    taskCompleted: raw.taskCompleted === true,
    looksReused: raw.looksReused === true,
    reason: typeof raw.reason === "string" ? raw.reason : "",
  };
}

export async function handleBountyVerification(job: Job<BountyVerificationJob>): Promise<void> {
  const { submissionId } = job.data;

  const submission = await prisma.bountySubmission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { bounty: true, clip: true },
  });

  await prisma.bountySubmission.update({
    where: { id: submissionId },
    data: { aiVerificationStatus: "PROCESSING" },
  });

  const template = await readFile(path.join(here, "prompts", "bountyVerification.txt"), "utf8");
  const prompt = template
    .replace("{{bountyTitle}}", submission.bounty.title)
    .replace("{{taskDescription}}", submission.bounty.taskDescription)
    .replace("{{game}}", submission.bounty.game)
    .replace("{{deadline}}", submission.bounty.deadline.toISOString())
    .replace("{{clipGame}}", submission.clip.aiGameDetected ?? submission.clip.game)
    .replace("{{clipTags}}", submission.clip.aiTags.join(", ") || "none")
    .replace("{{clipMoments}}", JSON.stringify(submission.clip.aiKeyMoments ?? []))
    .replace("{{clipScore}}", String(submission.clip.aiQualityScore ?? 0))
    .replace("{{clipDescription}}", submission.clip.description ?? "(none)");

  let parsed: BountyVerdict | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      parsed = parseVerdict(await askClaude(prompt));
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!parsed) {
    await prisma.bountySubmission.update({
      where: { id: submissionId },
      data: { aiVerificationStatus: "FAILED" },
    });
    throw new Error(
      `bounty-verification: unparseable Claude output for submission ${submissionId}: ${String(lastError)}`
    );
  }

  await prisma.bountySubmission.update({
    where: { id: submissionId },
    data: {
      aiVerificationStatus: "COMPLETED",
      aiConfidenceScore: parsed.confidence,
      aiReviewNotes: JSON.stringify(parsed),
      status: parsed.pass ? "AI_VERIFIED" : "AI_REJECTED",
    },
  });
  console.log("bounty-verification done", job.id, submissionId, parsed.pass, parsed.confidence);
}
