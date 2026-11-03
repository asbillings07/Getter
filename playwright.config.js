import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  retries: 0,
  timeout: 90000,
  globalTimeout: 300000,
  reporter: "list",
  use: { trace: "retain-on-failure" },
  outputDir: "test-results",
});
