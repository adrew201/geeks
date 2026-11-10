// Public, browser-safe config only. Every value here ships in the bundle.
const raw = import.meta.env;

/** Comma-separated path prefixes, e.g. "/auth,/api/v1/leaderboard". */
function prefixList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((prefix) => prefix.trim())
    .filter((prefix) => prefix.startsWith("/"));
}

export const env = {
  /**
   * Base URL of the API. Empty string = same origin: in dev, vite.config.ts proxies /auth,
   * /api and /health to VITE_PROXY_TARGET (used to reach the Render API, whose CORS only
   * allows the deployed site).
   */
  apiUrl: raw.VITE_API_URL ?? "http://localhost:3000",
  apiUrl: raw.VITE_API_URL ?? "http://localhost:3000",
  paypalClientId: raw.VITE_PAYPAL_CLIENT_ID ?? "",
  /**
   * Serve API calls from src/mocks instead of the network.
   * Defaults to ON in dev and OFF in production builds; set VITE_USE_MOCKS to override.
   */
  useMocks: raw.VITE_USE_MOCKS ? raw.VITE_USE_MOCKS === "true" : raw.DEV,
  /**
   * Hybrid mode: with mocks on, requests under these prefixes still go to the real API.
   * Add an endpoint here once the backend ships it; remove VITE_USE_MOCKS when all have.
   */
  realApiPrefixes: prefixList(raw.VITE_REAL_API),
} as const;

/** True when this request should go to the network rather than src/mocks. */
export function usesRealApi(path: string): boolean {
  if (!env.useMocks) return true;
  return env.realApiPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}
