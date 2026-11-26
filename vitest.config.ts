import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: true,
    restoreMocks: true,
    setupFiles: ["tests/setup.ts"],
    coverage: { provider: "v8", reporter: ["text", "lcov"], reportsDirectory: "coverage" },
  },
});
