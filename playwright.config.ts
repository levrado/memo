import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /visual-regression/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testIgnore: /visual-regression/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "visual-regression",
      testMatch: /[/\\]visual-regression/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "live-visual-regression",
      testMatch: /live-visual-regression/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 30_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_DISABLE_USAGE_TRACKING: "true",
          // Unauthenticated specs run without real Supabase credentials:
          // valid-looking placeholders let the app boot and treat every
          // request as logged out (auth.getUser() short-circuits before any
          // network call). The URL points at the dev server itself so
          // /api/health's reachability ping reports degraded, not down.
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
            "sb_publishable_placeholder",
        },
      },
});
