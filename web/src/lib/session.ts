// The only module that stores or reads the JWT.
//
// - Storage: localStorage (fine for the hackathon demo; swap for a cookie later).
// - Who is signed in comes from the token payload (API JWT: sub (user id), role, tier), mapped
//   through lib/role-adapter.ts. The API also has GET /auth/me, unused for now.
// - An expired, malformed or unsupported-role token counts as logged out: it is removed
//   and listeners are told. A timer also logs out the moment `exp` passes.
// - The payload is decoded for UI decisions only; the API still enforces every guard.
// - Never log the token.

import { useSyncExternalStore } from "react";
import type { JwtPayload, RawJwtPayload } from "../types/api.ts";
import { fromApiRole } from "./role-adapter.ts";

const TOKEN_KEY = "play2pro.token";
/** setTimeout's ceiling (~24.8 days); longer sessions re-arm when read again. */
const MAX_TIMER_MS = 2_147_483_647;

export interface Session extends JwtPayload {
  /** Epoch ms, or null when the token carries no `exp`. */
  expiresAt: number | null;
}

/* ---------------------------- storage ---------------------------- */

let memoryToken: string | null = null;

function readStorage(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return memoryToken;
  }
}

function writeStorage(token: string | null): void {
  memoryToken = token;
  try {
    if (token === null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode): keep the session in memory only */
  }
}

/* ---------------------------- decoding ---------------------------- */

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

function isRawPayload(value: unknown): value is RawJwtPayload {
  if (typeof value !== "object" || value === null) return false;
  const { sub, userId, role, exp } = value as Record<string, unknown>;
  // The API signs the user id as the standard `sub` claim; `userId` is still accepted.
  const id = sub ?? userId;
  return (
    typeof id === "string" &&
    id !== "" &&
    typeof role === "string" &&
    (exp === undefined || typeof exp === "number")
  );
}

/** Decodes a token into a session, or null if it's malformed or the role is unsupported. */
export function parseToken(token: string): Session | null {
  const payload = decodePayload(token);
  if (!isRawPayload(payload)) return null;
  const appRole = fromApiRole(payload.role, payload.tier);
  if (!appRole) return null;
  return {
    userId: payload.sub ?? payload.userId ?? "",
    ...appRole,
    expiresAt: payload.exp === undefined ? null : payload.exp * 1000,
  };
}

function isExpired(session: Session): boolean {
  return session.expiresAt !== null && session.expiresAt <= Date.now();
}

/* ---------------------------- state ---------------------------- */

const listeners = new Set<() => void>();
let cachedToken: string | null | undefined;
let cachedSession: Session | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
/** True after an explicit logout, until the next login. Expiry/401 logouts leave it false. */
let signedOutByUser = false;

function notify(): void {
  for (const listener of listeners) listener();
}

function armExpiry(session: Session | null): void {
  clearTimeout(expiryTimer);
  if (!session?.expiresAt) return;
  const ms = Math.min(session.expiresAt - Date.now(), MAX_TIMER_MS);
  expiryTimer = setTimeout(() => {
    if (cachedSession && isExpired(cachedSession)) clearSession();
    else armExpiry(cachedSession);
  }, Math.max(0, ms));
}

/** The current session, or null when signed out. Bad or expired tokens are removed. */
export function getSession(): Session | null {
  const token = readStorage();
  if (token !== cachedToken) {
    cachedToken = token;
    cachedSession = token ? parseToken(token) : null;
    armExpiry(cachedSession);
  }
  if (token && (!cachedSession || isExpired(cachedSession))) {
    // Log out silently: callers already see null, so no listener needs waking here.
    writeStorage(null);
    cachedToken = null;
    cachedSession = null;
    clearTimeout(expiryTimer);
  }
  return cachedSession;
}

/** The raw token for the Authorization header (api-client only). */
export function getToken(): string | null {
  return getSession() ? readStorage() : null;
}

/** Stores a token after login/signup. Returns the session, or null if the token is unusable. */
export function setToken(token: string): Session | null {
  const session = parseToken(token);
  if (!session || isExpired(session)) {
    clearSession();
    return null;
  }
  signedOutByUser = false;
  writeStorage(token);
  notify();
  return getSession();
}

/** Logs out locally. */
export function clearSession(): void {
  const hadToken = readStorage() !== null || cachedSession !== null;
  writeStorage(null);
  cachedToken = null;
  cachedSession = null;
  clearTimeout(expiryTimer);
  if (hadToken) notify();
}

/** Explicit logout from the UI (README has no logout endpoint; the JWT just stops being sent). */
export function logout(): void {
  signedOutByUser = true;
  clearSession();
}

/**
 * Whether the current signed-out state came from the user pressing Log out. The route guard
 * uses it to skip "return to this page" after a deliberate logout, so the next person to
 * log in isn't sent to the previous user's page.
 */
export function wasSignedOutByUser(): boolean {
  return signedOutByUser;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Another tab logged in or out.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === TOKEN_KEY || event.key === null) notify();
  });
}

/** React binding: re-renders on login, logout, expiry and changes in other tabs. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}
