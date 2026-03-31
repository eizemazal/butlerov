import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 60000, // 60 seconds timeout for tests
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    cwd: packageDir,
    url: "http://localhost:5173/index.html",
    /** Prefer reusing a dev server when the URL already responds (avoids port conflicts in sandboxes that set CI). */
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});

