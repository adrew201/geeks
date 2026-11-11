import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { askClaude } from "../lib/anthropic.js";
import { stripFences } from "./clipAnalysis.js";

export interface SkillSummaryJob {
  gamerId: string;
}

export interface SkillSummary {
  summary: string;
  strengths: string[];
  roles: string[];
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseSummary(text: string): SkillSummary {
  const raw = JSON.parse(stripFences(text)) as Partial<SkillSummary>;
  if (typeof raw.summary !== "string" || raw.summary.length === 0) {
    throw new Error("skill-summary: missing summary text");
  }
  return {
    summary: raw.summary,
    strengths: Array.isArray(raw.strengths)
      ? raw.strengths.filter((t): t is string => typeof t === "string")
      : [],
    roles: Array.isArray(raw.roles)
      ? raw.roles.filter((t): t is string => typeof t === "string")
      : [],
  };
}

export async function handleSkillSummary(job: Job<SkillSummaryJob>): Promise<void> {
  const { gamerId } = job.data;

  const clips = await prisma.clip.findMany({
    where: { gamerId, aiAnalysisStatus: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  if (clips.length === 0) {
    console.log("skill-summary: no analysed clips for gamer", gamerId);
    return;
  }

  let profile = await prisma.gamerProfile.findUnique({ where: { userId: gamerId } });
  if (!profile) {
    profile = await prisma.gamerProfile.create({
      data: { userId: gamerId, gamerTag: `gamer-${gamerId.slice(0, 8)}` },
    });
  }

  const clipLines = clips
    .map(
      (c) =>
        `- ${(c.aiGameDetected ?? c.game) ?? "Unknown"} | tags: ${(c.aiTags ?? []).join(", ") || "none"} | score: ${c.aiQualityScore ?? 0}`
    )
    .join("\n");
  const template = await readFile(path.join(here, "prompts", "skillSummary.txt"), "utf8");
  const prompt = template
    .replace("{{gamerTag}}", profile.gamerTag)
    .replace("{{clipsAnalysed}}", String(clips.length))
    .replace("{{clipLines}}", clipLines);

  let parsed: SkillSummary | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      parsed = parseSummary(await askClaude(prompt));
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!parsed) {
    throw new Error(`skill-summary: unparseable Claude output for gamer ${gamerId}: ${String(lastError)}`);
  }

  await prisma.gamerProfile.update({
    where: { id: profile.id },
    data: { aiSkillSummary: JSON.stringify(parsed) },
  });
  console.log("skill-summary done", job.id, gamerId, parsed.roles);
}
