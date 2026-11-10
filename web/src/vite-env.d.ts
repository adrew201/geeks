/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  readonly VITE_USE_MOCKS?: "true" | "false";
  /** Hybrid mode: path prefixes that bypass the mocks (see config/env.ts). */
  readonly VITE_REAL_API?: string;
  /** Dev only (vite.config.ts): where the dev-server proxy forwards /auth, /api and /health. */
  readonly VITE_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
