import { defineConfig } from "vitest/config";

export default defineConfig({
  // dist/ holds compiled copies of the tests; web/ has its own app and node_modules (zod's tests
  // live there); worktrees hold other branches' copies. Don't run any of them here.
  test: { exclude: ["dist/**", "node_modules/**", "web/**", ".claude/**"] },
});
