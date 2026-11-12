import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { clipAnalysisQueue } from "../lib/queues.js";

// Migration plan O4: one-off dev helper. Seed clips are created directly via
// prisma/seed.ts, bypassing createClip, so they never get analysis jobs and
// the AI badge/score stay blank. This enqueues analysis for every clip still
// waiting on it. Run: npx tsx src/workers/backfillClipAnalysis.ts
// Requires Redis up and `npm run dev:worker` running to process the jobs.
const clips = await prisma.clip.findMany({
  where: { aiAnalysisStatus: "PENDING" },
  select: { id: true, description: true, game: true, durationSeconds: true },
});

for (const clip of clips) {
  await clipAnalysisQueue.add("backfill", {
    clipId: clip.id,
    description: clip.description ?? undefined,
    game: clip.game,
    durationSeconds: clip.durationSeconds ?? undefined,
  });
}

console.log(`enqueued analysis for ${clips.length} pending clip(s)`);
process.exit(0);
