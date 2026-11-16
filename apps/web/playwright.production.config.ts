import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3108";

export default defineConfig({
  ...base,
  testMatch: ["**/production-smoke.spec.ts", "**/math-search.spec.ts"],
  fullyParallel: false,
  workers: 1,
  projects: [{ name: "production", use: { viewport: { width: 1440, height: 900 } } }],
  use: { ...base.use, baseURL },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? []
    : {
        command:
          "pnpm exec wrangler dev --config dist/server/wrangler.json --port 3108 --ip 127.0.0.1 --local --log-level error",
        url: `${baseURL}/zh-CN`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
