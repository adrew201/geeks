// Public, browser-safe config only. Every value here ships in the bundle.
const raw = import.meta.env;

export const env = {
  apiUrl: raw.VITE_API_URL ?? "http://localhost:3000",
  paypalClientId: raw.VITE_PAYPAL_CLIENT_ID ?? "",
  /**
   * Serve API calls from src/mocks instead of the network.
   * Defaults to ON in dev and OFF in production builds; set VITE_USE_MOCKS to override.
   */
  useMocks: raw.VITE_USE_MOCKS ? raw.VITE_USE_MOCKS === "true" : raw.DEV,
} as const;
