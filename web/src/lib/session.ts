// Who is signed in, read from the JWT payload (README §18: { userId, role, tier }).
// There is no /me endpoint in the README, so the token is the only client-side source.
// The payload is decoded for display decisions only (ads, "your position"); the API
// still enforces every guard.

import { env } from "../config/env.ts";
import { mockUser } from "../mocks/fixtures.ts";
import { ROLE, TIER, type JwtPayload } from "../types/api.ts";
import { tokenStore } from "./api-client.ts";

function decodePayload(token: string): unknown {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== "object" || value === null) return false;
  const { userId, role, tier } = value as Record<string, unknown>;
  return (
    typeof userId === "string" &&
    Object.values(ROLE).includes(role as JwtPayload["role"]) &&
    Object.values(TIER).includes(tier as JwtPayload["tier"])
  );
}

/** The current session, or null when signed out or the token is unreadable. */
export function getSession(): JwtPayload | null {
  if (env.useMocks) return { userId: mockUser.id, role: mockUser.role, tier: mockUser.tier };
  const token = tokenStore.get();
  if (!token) return null;
  const payload = decodePayload(token);
  return isJwtPayload(payload) ? payload : null;
}
