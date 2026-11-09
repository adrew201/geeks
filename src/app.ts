import Fastify from "fastify";
import auth from "./plugins/auth/index.js";
import payments from "./plugins/payments/index.js";
import profiles from "./plugins/profiles/index.js";
import communities from "./plugins/communities/index.js";
import webhooks from "./plugins/webhooks/index.js";
import clips from "./plugins/clips/index.js";
import bounties from "./plugins/bounties/index.js";
import ads from "./plugins/ads/index.js";
import coach from "./plugins/coach/index.js";
import leaderboard from "./plugins/leaderboard/index.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true }));

  app.register(auth, { prefix: "/auth" });
  for (const plugin of [payments, profiles, communities, webhooks, clips, bounties, ads, coach, leaderboard]) {
    app.register(plugin, { prefix: "/api/v1" });
  }
  return app;
}
