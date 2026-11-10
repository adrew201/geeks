// The only module that talks to the Play2Pro API.
// - Adds `Authorization: Bearer <jwt>` when a token is stored.
// - Turns every failure into an ApiError using README's { error: { code, message } } shape.
// - With env.useMocks, requests are answered by src/mocks instead of the network.

import { env } from "../config/env.ts";
import { mockRequest } from "../mocks/index.ts";
import { API_ERROR_CODE } from "../types/api.ts";
import { ApiError, toApiError } from "./api-error.ts";

export { ApiError } from "./api-error.ts";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
  /** Set false for public routes that must not send the JWT. Default true. */
  auth?: boolean;
}

const TOKEN_KEY = "play2pro.token";

/** JWT storage. localStorage is fine for the hackathon demo; swap for a cookie later if needed. */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode): keep the session in memory only */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export function buildPath(path: string, query?: QueryParams): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, query, signal, auth = true } = options;
  const url = buildPath(path, query);

  if (env.useMocks) {
    return mockRequest<T>(method, url, body, signal);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? tokenStore.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      API_ERROR_CODE.NETWORK_ERROR,
      "Can't reach Play2Pro right now. Check your connection and try again.",
    );
  }

  // README: GET /ads/next returns 204 for PAID users.
  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = toApiError(response.status, data);
    if (apiError.code === API_ERROR_CODE.UNAUTHENTICATED) tokenStore.clear();
    throw apiError;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    apiRequest<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    apiRequest<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    apiRequest<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    apiRequest<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    apiRequest<T>("DELETE", path, options),
};
