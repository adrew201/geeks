import type { Prisma, Role, Tier } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "./password.js";

export type SignupRole = "GAMER" | "COACH" | "SPONSOR";

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  tier: Tier;
  isVerifiedAdult: boolean;
};

type UserRow = PublicUser & { passwordHash: string };

/** Never return passwordHash (or any other column) to the client. */
function publicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    tier: u.tier,
    isVerifiedAdult: u.isVerifiedAdult,
  };
}

// Public Gamer ID shown on the profile, e.g. P2P-48213
async function freeGamerTag(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const tag = `P2P-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!(await tx.gamerProfile.findUnique({ where: { gamerTag: tag } }))) return tag;
  }
  throw new AppError(500, "INTERNAL", "Could not allocate a Gamer ID, try again");
}

export async function signup(input: {
  email: string;
  password: string;
  displayName: string;
  role: SignupRole;
}): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  try {
    // Tier always starts FREE; only a verified subscription webhook makes it PAID.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, displayName: input.displayName.trim(), role: input.role },
      });
      if (input.role === "GAMER") {
        await tx.gamerProfile.create({
          data: { userId: created.id, gamerTag: await freeGamerTag(tx) },
        });
      }
      return created;
    });
    return publicUser(user);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      throw new AppError(409, "CONFLICT", "An account with this email already exists");
    }
    throw e;
  }
}

export async function login(input: { email: string; password: string }): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  // Same message for unknown email and wrong password
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, "UNAUTHENTICATED", "Invalid email or password");
  }
  return publicUser(user);
}

/** Reads role/tier fresh from the DB: a webhook may have changed them since the token was issued. */
export async function getUser(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
  return publicUser(user);
}
