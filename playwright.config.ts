import { defineConfig, devices } from "@playwright/test";

const END_TO_END_PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One shared database and an ordered journey: run strictly one after another.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://localhost:${END_TO_END_PORT}`,
    ...devices["Pixel 7"],
    locale: "de-CH",
  },
  webServer: {
    // `rm` runs synchronously before `next dev` starts, so the server's own startup
    // hook (src/instrumentation.ts) never races globalSetup's cleanup of the same
    // directory: Playwright starts globalSetup and webServer concurrently, and a
    // separate `rm` in globalSetup could delete the freshly created photo folder
    // out from under the just-started server.
    command: `rm -rf ./.e2e-data && npx next dev --port ${END_TO_END_PORT}`,
    url: `http://localhost:${END_TO_END_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      WINE_INTELLIGENCE_MODE: "recorded",
      DATA_DIRECTORY: "./.e2e-data",
    },
  },
});
