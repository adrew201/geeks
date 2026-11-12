import type { FastifyRequest } from "fastify";
import type { Role, Tier } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

// Route guards (README section 18). Use after app.authenticate, e.g.
//   { preHandler: [app.authenticate, requireTier("PAID")] }
// Role comes from the JWT because it never changes. Tier is read from the database because
// a subscription webhook can change it after the token was issued.
// There is no age guard: donations and withdrawals are open to every account.

type Guard = (req: FastifyRequest) => Promise<void>;

function userId(req: FastifyRequest): string {
  const id = req.user?.sub;
  if (!id) throw new AppError(401, "UNAUTHENTICATED", "Log in to continue");
  return id;
}

async function loadUser(req: FastifyRequest) {
  const user = await prisma.user.findUnique({
    where: { id: userId(req) },
    select: { tier: true },
  });
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Log in to continue");
  return user;
}

export function requireRole(...roles: Role[]): Guard {
  return async (req) => {
    userId(req);
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN_ROLE", "Your account type can't do this");
    }
  };
}

export function requireTier(tier: Tier): Guard {
  return async (req) => {
    if ((await loadUser(req)).tier !== tier) {
      throw new AppError(403, "FORBIDDEN_TIER", "This needs a paid plan");
    }
  };
}
