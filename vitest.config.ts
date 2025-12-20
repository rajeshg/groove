import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    // Disable parallel execution to prevent SQLite database timeouts
    fileParallelism: false,
    maxConcurrency: 1,
    // Include all test files
    include: ["**/*.test.ts"],
    // Set a reasonable timeout for database operations
    testTimeout: 30000,
    hookTimeout: 30000,
    // Setup environment before tests
    setupFiles: [path.resolve(__dirname, "tests/setup.ts")],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
})
