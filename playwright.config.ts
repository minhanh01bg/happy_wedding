import { pbkdf2Sync } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const salt = "11111111111111111111111111111111";
const hash = pbkdf2Sync(
  "e2e-admin-password",
  Buffer.from(salt, "hex"),
  100000,
  32,
  "sha256",
).toString("hex");
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 20000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3201",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "pnpm exec tsx e2e/global-setup.ts && pnpm exec next dev -H 127.0.0.1 -p 3201",
    url: "http://127.0.0.1:3201",
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:./e2e.db",
      NEXT_DIST_DIR: ".next-e2e",
      STORE_PASSWORD_HASH: `${salt}:${hash}`,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3201",
      CANONICAL_ORIGIN: "http://127.0.0.1:3201",
      CSP_MODE: "report-only",
    },
  },
});
