import type { FastifyPluginAsync } from "fastify";
import { createClip, getFeedWithAds, toApiClip, voteOnClip } from "./service.js";

function sendError(reply: { code(n: number): any; send(e: unknown): unknown }, err: unknown) {
  const status =
    typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode: unknown }).statusCode) || 400
      : 500;
  return reply.code(status).send({ error: err instanceof Error ? err.message : "failed" });
}

export const clipRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: Record<string, unknown> }>(
    "/clips",
    {
      schema: {
        body: {
          type: "object",
          required: ["gamerId", "title", "videoUrl"],
          properties: {
            gamerId: { type: "string" },
            title: { type: "string", minLength: 1 },
            videoUrl: { type: "string", minLength: 1 },
            description: { type: "string" },
            game: { type: "string" },
            durationSeconds: { type: "number" },
            thumbnailUrl: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const b = req.body as {
          gamerId: string;
          title: string;
          videoUrl: string;
          description?: string;
          game?: string;
          durationSeconds?: number;
          thumbnailUrl?: string;
        };
        return reply.code(201).send(toApiClip(await createClip(b)));
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  // Migration plan O1: GET /api/v1/clips/feed is the paged contract
  // { items, nextCursor } with house ads interleaved.
  app.get("/clips/feed", async (req) => {
    const q = req.query as { cursor?: string; game?: string };
    return getFeedWithAds(q.cursor, q.game);
  });

  // Temporary alias until Nigel's N-feed cut-over moves the web to /clips/feed.
  app.get("/feed", async (req) => {
    const q = req.query as { cursor?: string; game?: string };
    return getFeedWithAds(q.cursor, q.game);
  });

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/clips/:id/vote",
    {
      schema: {
        body: {
          type: "object",
          required: ["voterId", "direction"],
          properties: {
            voterId: { type: "string" },
            direction: { type: "string", enum: ["UP", "DOWN"] },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const b = req.body as { voterId: string; direction: "UP" | "DOWN" };
        return reply.send(
          await voteOnClip({ clipId: (req.params as { id: string }).id, ...b })
        );
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );
};
