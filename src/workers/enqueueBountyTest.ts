import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { bountyVerificationQueue } from "../lib/queues.js";

// One-off dev helper: builds a full bounty scenario on the newest test gamer
// that already has a COMPLETED clip, then enqueues verification.
// Run AFTER a clip-analysis + skill-summary cycle finished:
//   npx tsx src/workers/enqueueBountyTest.ts
const gamer = await prisma.user.findFirst({
  where: { clips: { some: { aiAnalysisStatus: "COMPLETED" } } },
  orderBy: { createdAt: "desc" },
  include: { clips: { where: { aiAnalysisStatus: "COMPLETED" }, take: 1 } },
});
if (!gamer || gamer.clips.length === 0) {
  console.log("no gamer with a COMPLETED clip found; run enqueueTest.ts and the worker first");
  process.exit(1);
}
const clip = gamer.clips[0];

const stamp = Date.now();
const creator = await prisma.user.create({
  data: {
    email: `sponsor-${stamp}@example.com`,
    username: `sponsor${stamp}`,
    displayName: "Test Sponsor",
    passwordHash: "test-only-not-for-login",
    role: "SPONSOR",
  },
});

const bounty = await prisma.bounty.create({
  data: {
    creatorId: creator.id,
    title: "Win a 1v3 clutch",
    taskDescription: "Post a clip of winning a 1v3 clutch round in Valorant",
    game: clip.aiGameDetected ?? clip.game,
    rewardAmount: 25,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: "OPEN_ESCROWED",
  },
});

const submission = await prisma.bountySubmission.create({
  data: { bountyId: bounty.id, gamerId: gamer.id, clipId: clip.id },
});

await bountyVerificationQueue.add("test", { submissionId: submission.id });
console.log("enqueued verification", submission.id, "for bounty", bounty.id);
process.exit(0);
