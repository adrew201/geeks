import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { askClaude } from "../lib/anthropic.js";
import { skillSummaryQueue } from "../lib/queues.js";

export interface ClipAnalysisJob {
  clipId: string;
  thumbnailUrl?: string;
  description?: string;
  game?: string;
  durationSeconds?: number;
}

export interface ClipAnalysisResult {
  game: string;
  keyMoments: { t: string; label: string }[];
  stats: Record<string, unknown>;
  tags: string[];
  aiQualityScore: number;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function stripFences(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : text).trim();
}

export function parseResult(text: string): ClipAnalysisResult {
  const raw = JSON.parse(stripFences(text)) as Partial<ClipAnalysisResult>;
  return {
    game: typeof raw.game === "string" ? raw.game : "Unknown",
    keyMoments: Array.isArray(raw.keyMoments) ? raw.keyMoments : [],
    stats:
      typeof raw.stats === "object" && raw.stats !== null
        ? (raw.stats as Record<string, unknown>)
        : {},
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === "string")
      : [],
    aiQualityScore: typeof raw.aiQualityScore === "number" ? raw.aiQualityScore : 0,
  };
}

async function callClaude(prompt: string): Promise<string> {
  return askClaude(prompt);
}

export async function handleClipAnalysis(job: Job<ClipAnalysisJob>): Promise<void> {
  const { clipId, thumbnailUrl, description, game, durationSeconds } = job.data;

  await prisma.clip.update({
    where: { id: clipId },
    data: { aiAnalysisStatus: "PROCESSING" },
  });

  const template = await readFile(path.join(here, "prompts", "clipAnalysis.txt"), "utf8");
  const prompt = template
    .replace("{{game}}", game ?? "Unknown")
    .replace("{{description}}", description ?? "(none)")
    .replace("{{thumbnailUrl}}", thumbnailUrl ?? "(none)")
    .replace("{{durationSeconds}}", String(durationSeconds ?? "(unknown)"));

  let parsed: ClipAnalysisResult | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      parsed = parseResult(await callClaude(prompt));
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!parsed) {
    await prisma.clip.update({
      where: { id: clipId },
      data: { aiAnalysisStatus: "FAILED" },
    });
    throw new Error(
      `clip-analysis: unparseable Claude output for clip ${clipId}: ${String(lastError)}`
    );
  }

  await prisma.clip.update({
    where: { id: clipId },
    data: {
      aiGameDetected: parsed.game,
      aiKeyMoments: parsed.keyMoments,
      aiTags: parsed.tags,
      aiQualityScore: parsed.aiQualityScore,
      aiAnalysisStatus: "COMPLETED",
    },
  });

  const clip = await prisma.clip.findUniqueOrThrow({ where: { id: clipId } });
  await skillSummaryQueue.add("summarize", { gamerId: clip.gamerId });
  console.log("clip-analysis done", job.id, clipId, parsed.tags);
}
