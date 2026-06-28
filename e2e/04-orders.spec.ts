import { test, expect } from "@playwright/test";

const APPROVED_EMAIL = process.env.E2E_VENDOR_EMAIL ?? "";
const APPROVED_PASS = process.env.E2E_VENDOR_PASSWORD ?? "";
const SLUG = process.env.E2E_STORE_SLUG ?? "";

test.describe("Order management", () => {
  test.skip(
    !APPROVED_EMAIL,
    "Set E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD to run order tests"
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/orders");
  });

  test("orders page loads with correct table headers", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
    await expect(page.getByText(/reference/i)).toBeVisible();
    await expect(page.getByText(/status/i)).toBeVisible();
    await expect(page.getByText(/total/i)).toBeVisible();
  });

  test("orders table shows order rows or empty state", async ({ page }) => {
    const tbody = page.locator("tbody");
    await expect(tbody).toBeVisible();
    const rows = tbody.locator("tr");
    const count = await rows.count();
    if (count === 1) {
      await expect(page.getByText(/no orders/i)).toBeVisible();
    } else {
      // Has orders — at least one status chip visible
      await expect(
        tbody.getByText(/pending|paid|fulfilled|cancelled/i).first()
      ).toBeVisible();
    }
  });

  test("filter pills are visible and clickable", async ({ page }) => {
    for (const label of ["All", "Pending", "Paid", "Fulfilled", "Cancelled"]) {
      await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("paid filter navigates and stays on orders", async ({ page }) => {
    await page.getByRole("link", { name: "Paid", exact: true }).click();
    await page.waitForURL("**/admin/orders?status=paid");
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
  });

  test("order tracking page takes email input", async ({ page }) => {
    test.skip(!SLUG, "Set E2E_STORE_SLUG to test order tracking");
    await page.goto(`/shop/${SLUG}/track`);
    await expect(page.getByPlaceholder(/jane@example.com/i)).toBeVisible({ timeout: 5000 });
  });
});
