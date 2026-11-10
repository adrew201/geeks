import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { errorHandler } from "./errors.js";

/**
 * Wiring every plugin relies on: JWT, the shared error shape, and the
 * `app.authenticate` preHandler. Call this before registering plugins.
 */
export function setupCore(app: FastifyInstance) {
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    // Keeps the app booting if JWT_SECRET is not set yet, but tokens stop working
    // after every restart. Set JWT_SECRET on Render for stable logins.
    secret = randomBytes(32).toString("hex");
    app.log.warn("JWT_SECRET is not set: using a random one-off secret (logins reset on restart)");
  }

  // The web app calls the API from another origin. CORS_ORIGIN is a comma-separated list
  // (set it to the deployed web URL on Render); the default is the Vite dev server.
  app.register(cors, {
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((o) => o.trim()),
  });

  app.register(jwt, { secret, sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" } });
  app.setErrorHandler(errorHandler);

  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Log in to continue" } });
    }
  });
}
