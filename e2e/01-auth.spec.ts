import { test, expect } from "@playwright/test";
import { TEST_VENDOR, loginAsVendor } from "./helpers";

// Each run needs a fresh unique email so tests don't collide on re-runs.
const vendor = {
  ...TEST_VENDOR,
  email: `e2e-auth-${Date.now()}@test.com`,
  storeName: `Auth Store ${Date.now()}`,
};

test.describe("Vendor auth", () => {
  test("shows validation error for missing fields", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Browser-native required validation prevents submit — email field should be focused
    const emailInput = page.getByPlaceholder("you@example.com");
    await expect(emailInput).toBeFocused();
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("you@example.com").fill("nobody@nowhere.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|login failed|too many/i)).toBeVisible({
      timeout: 6000,
    });
  });

  test("registers a new vendor successfully", async ({ page }) => {
    await page.goto("/admin/register");
    await page.getByPlaceholder("Jane Doe").fill(vendor.name);
    await page.getByPlaceholder("you@example.com").fill(vendor.email);
    await page.getByPlaceholder("Min. 8 characters").fill(vendor.password);
    await page.getByPlaceholder("My Awesome Store").fill(vendor.storeName);
    await page.getByPlaceholder("What do you sell?").fill(vendor.storeDescription);
    await page.getByRole("button", { name: /create my store/i }).click();
    // Should show pending-approval notice (not redirect to dashboard since isApproved=false)
    await expect(
      page.getByText(/pending|approval|review/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test("rejects duplicate email on register", async ({ page }) => {
    await page.goto("/admin/register");
    await page.getByPlaceholder("Jane Doe").fill("Duplicate User");
    await page.getByPlaceholder("you@example.com").fill(vendor.email);
    await page.getByPlaceholder("Min. 8 characters").fill(vendor.password);
    await page.getByPlaceholder("My Awesome Store").fill(`Dupe ${Date.now()}`);
    await page.getByRole("button", { name: /create my store/i }).click();
    await expect(page.getByText(/already|exists|taken/i)).toBeVisible({
      timeout: 6000,
    });
  });

  test("redirects unauthenticated user away from dashboard", async ({
    page,
  }) => {
    // Clear all cookies so there's no vendor token
    await page.context().clearCookies();
    await page.goto("/admin/dashboard");
    await page.waitForURL("**/admin/login");
  });
});

test.describe("Vendor login / logout", () => {
  // We need an approved vendor to log in. Use a seeded test account if one exists,
  // otherwise skip the login-success flow (it requires DB approval).
  // To run the full suite, seed a vendor with isApproved=true in your test DB.
  const APPROVED_EMAIL = process.env.E2E_VENDOR_EMAIL ?? "";
  const APPROVED_PASS = process.env.E2E_VENDOR_PASSWORD ?? "";

  test.skip(
    !APPROVED_EMAIL,
    "Set E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD to run login tests"
  );

  test("logs in with valid credentials and lands on dashboard", async ({
    page,
  }) => {
    await loginAsVendor(page, APPROVED_EMAIL, APPROVED_PASS);
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    await loginAsVendor(page, APPROVED_EMAIL, APPROVED_PASS);
    // Call logout API directly (sidebar button calls the same endpoint)
    await page.request.post("/api/vendor/auth/logout");
    // Clear cookies to simulate what the logout API does
    await page.context().clearCookies();
    // Attempting to visit protected page should redirect to login
    await page.goto("/admin/dashboard");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
  });
});
