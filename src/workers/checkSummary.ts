import "dotenv/config";
import { prisma } from "../lib/prisma.js";

// Read-only check: shows every test gamer, their clips, and their aiSkillSummary.
// Run: npx tsx src/workers/checkSummary.ts
const gamers = await prisma.user.findMany({
  where: { clips: { some: {} } },
  include: {
    clips: {
      select: { id: true, title: true, aiAnalysisStatus: true, aiQualityScore: true },
    },
    profile: true,
  },
  orderBy: { createdAt: "desc" },
  take: 10,
});

if (gamers.length === 0) {
  console.log("no gamers with clips found");
}

for (const g of gamers) {
  console.log("gamer:", g.username);
  for (const c of g.clips) {
    console.log(`  clip ${c.id} | ${c.aiAnalysisStatus} | score ${c.aiQualityScore}`);
  }
  if (!g.profile?.aiSkillSummary) {
    console.log("  profile:", g.profile ? g.profile.gamerTag : "(none)", "| aiSkillSummary: (empty)");
    continue;
  }
  console.log("  profile:", g.profile.gamerTag);
  try {
    const s = JSON.parse(g.profile.aiSkillSummary) as {
      summary?: string;
      strengths?: string[];
      roles?: string[];
    };
    console.log("  summary:", s.summary ?? "(missing)");
    console.log("  strengths:", (s.strengths ?? []).join(", ") || "(none)");
    console.log("  roles:", (s.roles ?? []).join(", ") || "(none)");
  } catch {
    console.log("  aiSkillSummary (raw):", g.profile.aiSkillSummary);
  }
}
process.exit(0);
