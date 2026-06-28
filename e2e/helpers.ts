import { Page } from "@playwright/test";

export const TEST_VENDOR = {
  name: "E2E Test Vendor",
  email: `e2e-vendor-${Date.now()}@test.com`,
  password: "TestPass123!",
  storeName: `E2E Store ${Date.now()}`,
  storeDescription: "Automated test store",
};

export const TEST_PRODUCT = {
  name: "E2E Test Product",
  price: "5000",
  description: "A product created by Playwright",
};

export const TEST_BUYER = {
  name: "Test Buyer",
  email: "buyer@test.com",
  phone: "08012345678",
  address: "12 Test Street, Lagos",
  state: "Lagos",
};

/** Log in as a vendor and land on the admin dashboard. */
export async function loginAsVendor(
  page: Page,
  email: string,
  password: string
) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/admin/dashboard");
}
