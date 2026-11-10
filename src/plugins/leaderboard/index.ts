import type { FastifyPluginAsync } from "fastify";
import { getLeaderboard } from "../../lib/ranking/leaderboard.js";

const querystring = {
  type: "object",
  properties: { game: { type: "string", maxLength: 50 } },
} as const;

const response = {
  200: {
    type: "object",
    required: ["game", "entries"],
    properties: {
      game: { type: ["string", "null"] },
      entries: {
        type: "array",
        items: {
          type: "object",
          required: ["rank", "gamerId", "gamerTag", "displayName", "avatarUrl", "primaryGame", "region", "radScore", "currentElo"],
          properties: {
            rank: { type: "integer" },
            gamerId: { type: "string" },
            gamerTag: { type: "string" },
            displayName: { type: "string" },
            avatarUrl: { type: ["string", "null"] },
            primaryGame: { type: "string" },
            region: { type: ["string", "null"] },
            radScore: { type: "number" },
            currentElo: { type: "number" },
          },
        },
      },
    },
  },
} as const;

const leaderboardPlugin: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { game?: string } }>(
    "/leaderboard",
    { schema: { querystring, response } },
    async (request) => getLeaderboard(request.query.game),
  );
};

export default leaderboardPlugin;
