import type { FastifyPluginAsync } from "fastify";
import { getDashboard, getPublicProfile, liveDashboardDeps } from "./dashboard.js";

// Rabasa owns. Mounted at /api/v1 by app.ts.
const profilesPlugin: FastifyPluginAsync = async (app) => {
  // Public Gamer ID. No login needed; a token, if sent, lets the owner see a private profile.
  app.get("/gamers/:id", async (req) => {
    const { id } = req.params as { id: string };
    let viewerId: string | undefined;
    try {
      await req.jwtVerify();
      viewerId = req.user.sub;
    } catch {
      // anonymous visitor
    }
    return getPublicProfile(await liveDashboardDeps(), { viewerId, id });
  });

  // Owner's dashboard: stats plus wallet. COACH/SPONSOR get the summary only.
  app.get("/gamers/:id/dashboard", { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    return getDashboard(await liveDashboardDeps(), {
      viewerId: req.user.sub,
      viewerRole: req.user.role,
      id,
    });
  });
};

export default profilesPlugin;
