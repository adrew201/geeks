import { defineConfig } from "vitest/config";

export default defineConfig({
  // dist/ holds compiled copies of the tests; don't run them twice
  test: { exclude: ["dist/**", "node_modules/**"] },
});
