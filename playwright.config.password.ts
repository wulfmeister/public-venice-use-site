import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for testing password protection.
 * Run with: npx playwright test --config playwright.config.password.ts
 */

export default defineConfig({
  testDir: "./e2e",
  testMatch: "password-protection.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3005",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-password",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "DEPLOYMENT_PASSWORD=test npm run dev -- --port 3005",
    url: "http://localhost:3005",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DEPLOYMENT_PASSWORD: "test",
    },
  },
});
