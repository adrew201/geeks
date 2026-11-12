import type { FastifyPluginAsync } from "fastify";
import { getUser, login, signup, type PublicUser } from "./service.js";

const signupSchema = {
  body: {
    type: "object",
    required: ["email", "password", "displayName", "role", "dateOfBirth"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email", maxLength: 200 },
      password: { type: "string", minLength: 8, maxLength: 128 },
      displayName: { type: "string", minLength: 1, maxLength: 60 },
      // YYYY-MM-DD. The age limits are checked in signup() (src/lib/age.ts).
      dateOfBirth: { type: "string", format: "date" },
      // ADMIN can never be self-assigned
      role: { type: "string", enum: ["GAMER", "COACH", "SPONSOR"] },
    },
  },
} as const;

const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", maxLength: 200 },
      password: { type: "string", maxLength: 128 },
    },
  },
} as const;

const authPlugin: FastifyPluginAsync = async (app) => {
  const withToken = (user: PublicUser) => ({
    token: app.jwt.sign({ sub: user.id, role: user.role, tier: user.tier }),
    user,
  });

  app.post("/signup", { schema: signupSchema }, async (req, reply) => {
    const user = await signup(req.body as Parameters<typeof signup>[0]);
    return reply.code(201).send(withToken(user));
  });

  app.post("/login", { schema: loginSchema }, async (req) => {
    return withToken(await login(req.body as Parameters<typeof login>[0]));
  });

  // Also returns a fresh token: role/tier are read from the DB, so after the subscription
  // webhook makes a user PAID the web app can swap in a token that says so (no re-login).
  app.get("/me", { preHandler: app.authenticate }, async (req) => withToken(await getUser(req.user.sub)));
};

export default authPlugin;
