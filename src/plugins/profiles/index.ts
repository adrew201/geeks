import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { getGamerDashboard, getGamerProfile, type Viewer } from "./service.js";

const idSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", maxLength: 64 } },
  },
} as const;

/** The signed-in user if a valid token was sent, otherwise null (the Gamer ID is public). */
async function optionalViewer(req: FastifyRequest): Promise<Viewer | null> {
  if (!req.headers.authorization) return null;
  try {
    await req.jwtVerify();
    return req.user as Viewer;
  } catch {
    return null;
  }
}

const profilesPlugin: FastifyPluginAsync = async (app) => {
  // Public Gamer ID. A private profile is visible to its owner only.
  app.get("/gamers/:id", { schema: idSchema }, async (req) => {
    const { id } = req.params as { id: string };
    return getGamerProfile(id, await optionalViewer(req));
  });

  // README 14: owner, COACH (read-only), SPONSOR (summary only). Wallet for the owner only.
  app.get("/gamers/:id/dashboard", { schema: idSchema, preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    return getGamerDashboard(id, req.user as Viewer);
  });
};

export default profilesPlugin;
