import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role, Tier } from "@prisma/client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: Role; tier: Tier };
    user: { sub: string; role: Role; tier: Tier };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler: 401 UNAUTHENTICATED unless a valid Bearer token is sent. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
