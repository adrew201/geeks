import { api, ApiError } from "../../lib/api-client.ts";
import { toApiRole } from "../../lib/role-adapter.ts";
import { setToken, type Session } from "../../lib/session.ts";
import { API_ERROR_CODE, type AuthResponse, type LoginRequest, type Role, type SignupRequest } from "../../types/api.ts";

// README §14: POST /auth/signup and POST /auth/login (Rabasa). Public routes: no JWT sent.
// Request bodies carry the password; never log them.

/**
 * UNCONFIRMED: status for signing up with an email that already exists (User.email is
 * unique, README §13). Used to put the API message on the email field as well as the banner.
 */
export const EMAIL_TAKEN_STATUS = 409;

function tokenFrom(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const { token } = response as Partial<AuthResponse>;
  return typeof token === "string" && token !== "" ? token : null;
}

/**
 * GET /auth/me re-reads role and tier from the database and returns a fresh token. Used after
 * a subscription activates, so the session shows the new tier without logging out.
 * Returns the new session, or null if no token came back.
 */
export async function refreshSession(): Promise<Session | null> {
  const token = tokenFrom(await api.get<AuthResponse>("/auth/me"));
  return token ? setToken(token) : null;
}

export async function login(credentials: LoginRequest): Promise<string> {
  const response = await api.post<AuthResponse>("/auth/login", credentials, { auth: false });
  const token = tokenFrom(response);
  if (!token) throw new ApiError(500, API_ERROR_CODE.UNKNOWN_ERROR, "Login succeeded but no session was returned.");
  return token;
}

/**
 * Creates the account and returns a token. The signup response is undocumented, so when it
 * carries no token we log in with the same credentials.
 */
export async function signup(
  email: string,
  password: string,
  role: Role,
  displayName: string,
  dateOfBirth: string,
): Promise<string> {
  const body: SignupRequest = { email, password, displayName, role: toApiRole(role), dateOfBirth };
  const response = await api.post<AuthResponse | undefined>("/auth/signup", body, { auth: false });
  return tokenFrom(response) ?? login({ email, password });
}
