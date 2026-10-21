import { defineConfig, devices } from "@playwright/test";

// Set PW_CHANNEL=msedge (or chrome) to use an installed browser when Playwright's own download is unavailable.
const channel = process.env.PW_CHANNEL || undefined;
const chromium = { ...devices["Desktop Chrome"], channel };

const viewport = (name, width, height, extra = {}) => ({
  name,
  use: { ...chromium, viewport: { width, height }, hasTouch: width < 1024, isMobile: width < 768, ...extra }
});

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.js/,
  timeout: 30000,
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:4173" },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120000,
    env: { VITE_DEMO: "true", VITE_DEMO_SEED: "true" }
  },
  projects: [
    viewport("iphone-375", 375, 667),
    viewport("iphone-393", 393, 852),
    viewport("iphone-430", 430, 932),
    viewport("tablet-820", 820, 1180),
    viewport("desktop-1366", 1366, 768),
    viewport("desktop-1920", 1920, 1080)
  ]
});
