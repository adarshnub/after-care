import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: "list",
  outputDir: path.join(os.tmpdir(), "aftercare-e2e-results"),
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    viewport: { width: 1536, height: 1024 },
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined,
  },
});
