import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Enable concurrent execution with unique databases per run
    fileParallelism: true,
    maxConcurrency: 4,
    // Include unit tests colocated in app/ and integration tests in tests/
    include: [
      "app/**/*.test.ts", // Unit tests colocated
      "tests/integration/**/*.test.ts", // Integration tests
    ],
    exclude: ["tests/e2e/**"], // Exclude E2E tests (run with Playwright)
    // Set a reasonable timeout for database operations
    testTimeout: 30000,
    hookTimeout: 30000,
    // Setup environment before tests
    setupFiles: [path.resolve(__dirname, "tests/setup/vitest.setup.ts")],
    globalSetup: [path.resolve(__dirname, "tests/setup/vitest.global.ts")],
    // Coverage reports
    coverage: {
      provider: "v8",
      reportsDirectory: "./test-output/coverage",
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
