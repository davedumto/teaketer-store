import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // Unauthenticated tests (auth spec, public storefront, repay buyer/API flow)
      name: "public",
      testMatch: ["**/01-auth.spec.ts", "**/03-storefront.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Authenticated tests — reuse the cookie saved in global-setup
      name: "authenticated",
      testMatch: ["**/02-products.spec.ts", "**/04-orders.spec.ts", "**/05-affiliates.spec.ts", "**/06-repay.spec.ts", "**/07-stock.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth-state.json",
      },
    },
  ],
});
