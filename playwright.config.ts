import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Mobile Compact (360px)",
      use: {
        viewport: { width: 360, height: 640 },
        isMobile: true,
      },
    },
    {
      name: "Tablet (768px)",
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "Desktop (1280px)",
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
