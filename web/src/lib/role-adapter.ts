// The single adapter between the API's role values and the app's ROLE + TIER.
//
// UNCONFIRMED (ask Rabasa): README §13 says User has `role` (GAMER | COACH | SPONSOR) and
// `tier` (FREE | PAID). prisma/schema.prisma has one combined enum instead:
// GAMER_FREE | GAMER_PAID | COACH | SPONSOR | ADMIN. Reading accepts both formats.
// Writing (the signup body) follows API_ROLE_FORMAT; flip it here if the API ships the
// schema enum, and nothing else in the app has to change.

import { API_ROLE, ROLE, TIER, type ApiRole, type Role, type Tier } from "../types/api.ts";

export const API_ROLE_FORMAT: "split" | "combined" = "split";

export interface AppRole {
  role: Role;
  tier: Tier;
}

function toTier(tier: unknown): Tier {
  return tier === TIER.PAID ? TIER.PAID : TIER.FREE;
}

/**
 * Maps API role (+ optional tier) to the app's role and tier. Returns null for roles the
 * web app doesn't support (ADMIN, or anything unknown).
 */
export function fromApiRole(role: unknown, tier?: unknown): AppRole | null {
  switch (role) {
    case API_ROLE.GAMER_FREE:
      return { role: ROLE.GAMER, tier: TIER.FREE };
    case API_ROLE.GAMER_PAID:
      return { role: ROLE.GAMER, tier: TIER.PAID };
    case API_ROLE.GAMER:
      return { role: ROLE.GAMER, tier: toTier(tier) };
    case API_ROLE.COACH:
      // The combined enum has no paid coach value; the split format may send tier PAID.
      return { role: ROLE.COACH, tier: toTier(tier) };
    case API_ROLE.SPONSOR:
      return { role: ROLE.SPONSOR, tier: toTier(tier) };
    default:
      return null;
  }
}

/** The role value to send on signup. New accounts always start FREE (README §14). */
export function toApiRole(role: Role): ApiRole {
  if (API_ROLE_FORMAT === "combined" && role === ROLE.GAMER) return API_ROLE.GAMER_FREE;
  return role;
}
