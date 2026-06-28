import { test, expect } from "@playwright/test";

const APPROVED_EMAIL = process.env.E2E_VENDOR_EMAIL ?? "";
const APPROVED_PASS = process.env.E2E_VENDOR_PASSWORD ?? "";
const SLUG = process.env.E2E_STORE_SLUG ?? "";

test.describe("Affiliate admin view", () => {
  test.skip(
    !APPROVED_EMAIL,
    "Set E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD to run affiliate admin tests"
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/affiliates");
  });

  test("affiliates page loads with correct table headers", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /affiliates/i })).toBeVisible();
    for (const col of ["Affiliate", "Code", "Earned", "Status"]) {
      await expect(page.getByText(col, { exact: true })).toBeVisible();
    }
  });

  test("affiliates table shows rows or empty state", async ({ page }) => {
    const tbody = page.locator("tbody");
    await expect(tbody).toBeVisible();
    // Either the empty-state message is visible, or at least one Active/Inactive chip is present
    const emptyMsg = page.getByText(/no affiliates yet/i);
    const activeChip = tbody.getByText(/^Active$|^Inactive$/i).first();
    const hasEmpty = await emptyMsg.isVisible();
    const hasRows = await activeChip.isVisible();
    expect(hasEmpty || hasRows).toBe(true);
  });
});

test.describe("Affiliate public signup", () => {
  test.skip(!SLUG, "Set E2E_STORE_SLUG to run affiliate signup tests");

  test("affiliate signup page is accessible", async ({ page }) => {
    await page.goto(`/shop/${SLUG}/affiliate`);
    await expect(page.getByRole("heading", { name: /join the program/i })).toBeVisible({
      timeout: 6000,
    });
  });

  test("referral link (?ref=CODE) loads storefront without error", async ({ page }) => {
    await page.goto(`/shop/${SLUG}?ref=TESTCODE123`);
    await expect(page).not.toHaveURL(/error|not-found/);
    await expect(page.locator("body")).not.toContainText("404");
    // Storefront products should still render
    await expect(
      page.getByRole("button", { name: /add to bag/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });
});
