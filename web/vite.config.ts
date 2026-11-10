import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev proxy: with VITE_PROXY_TARGET set (e.g. the Render API) and VITE_API_URL empty, the
// browser calls /auth, /api and /health on the dev server, which forwards them. The API's
// CORS only allows the deployed site, so this is how localhost reaches it. Dev only; the
// production build calls VITE_API_URL directly.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const target = env.VITE_PROXY_TARGET;
  const proxied = { target, changeOrigin: true, secure: true };
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: target ? { "/auth": proxied, "/api": proxied, "/health": proxied } : undefined,
    },
  };
});
