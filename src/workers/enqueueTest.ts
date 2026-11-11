import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { clipAnalysisQueue } from "../lib/queues.js";

// One-off dev helper: creates a test gamer + clip and enqueues analysis.
// Run: npx tsx src/workers/enqueueTest.ts
const stamp = Date.now();
const user = await prisma.user.create({
  data: {
    email: `test-gamer-${stamp}@example.com`,
    username: `testgamer${stamp}`,
    displayName: "Test Gamer",
    passwordHash: "test-only-not-for-login",
  },
});

const clip = await prisma.clip.create({
  data: {
    gamerId: user.id,
    title: "Test clutch clip",
    description: "1v3 clutch with sheriff on Bind",
    videoUrl: "https://example.com/clip.mp4",
    game: "Valorant",
    durationSeconds: 32,
  },
});

await clipAnalysisQueue.add("test", {
  clipId: clip.id,
  thumbnailUrl: "https://example.com/thumb.jpg",
  description: clip.description,
  game: clip.game,
  durationSeconds: clip.durationSeconds,
});

console.log("enqueued clip", clip.id, "for gamer", user.id);
process.exit(0);
