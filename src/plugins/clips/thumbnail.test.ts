import { describe, expect, it, vi } from "vitest";

// Pure helpers, but importing service.ts pulls the database and queue
// modules, so both are stubbed before the import.
vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));
vi.mock("../../lib/queues.js", () => ({ clipAnalysisQueue: { add: async () => undefined } }));
vi.mock("../../lib/ranking/index.js", () => ({
  recordVote: vi.fn(async () => undefined),
  recomputeRadScore: vi.fn(async () => undefined),
}));

import type { Clip } from "@prisma/client";
import { thumbnailUrlForClip, toApiClip, youtubeThumbnailId } from "./service.js";

describe("youtubeThumbnailId", () => {
  it("reads watch URLs with the id in any query position", () => {
    expect(youtubeThumbnailId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeThumbnailId("https://www.youtube.com/watch?list=abc&v=dQw4w9WgXcQ&t=10")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("reads short, embed and shorts URLs", () => {
    expect(youtubeThumbnailId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeThumbnailId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeThumbnailId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube and malformed URLs", () => {
    expect(youtubeThumbnailId("https://example.com/clips/clp_1.mp4")).toBeNull();
    expect(youtubeThumbnailId("https://www.youtube.com/watch")).toBeNull();
    expect(youtubeThumbnailId("not a url")).toBeNull();
  });
});

describe("thumbnailUrlForClip", () => {
  it("builds the default thumbnail URL for YouTube clips", () => {
    expect(thumbnailUrlForClip("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("returns null when no id can be derived", () => {
    expect(thumbnailUrlForClip("https://example.com/clips/clp_1.mp4")).toBeNull();
  });
});

describe("toApiClip", () => {
  function row(videoUrl: string): Clip {
    return {
      id: "clip-1",
      gamerId: "gamer-1",
      title: "title",
      videoUrl,
      description: "desc",
      game: "Valorant",
      durationSeconds: null,
      status: "ACTIVE",
      upvoteCount: 0,
      downvoteCount: 0,
      eloRating: 1500,
      aiTags: [],
      aiKeyMoments: [],
      aiQualityScore: null,
      aiAnalysisStatus: "COMPLETED",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Clip;
  }

  it("includes the derived thumbnail for YouTube clips", () => {
    expect(toApiClip(row("https://youtu.be/dQw4w9WgXcQ")).thumbnailUrl).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("leaves thumbnailUrl null for direct uploads", () => {
    expect(toApiClip(row("https://example.com/clips/clp_1.mp4")).thumbnailUrl).toBeNull();
  });
});
