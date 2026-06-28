import { test, expect } from "@playwright/test";
import { createClient } from "@libsql/client";

const APPROVED_EMAIL = process.env.E2E_VENDOR_EMAIL ?? "";

test.describe("Product management", () => {
  test.skip(!APPROVED_EMAIL, "Set E2E_VENDOR_EMAIL to run product tests");

  test.afterAll(async () => {
    // Delete any products left behind by these tests
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("DELETE FROM OrderItem WHERE productId IN (SELECT id FROM Product WHERE name LIKE 'E2E%')");
    await db.execute("DELETE FROM Product WHERE name LIKE 'E2E%'");
    await db.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/products");
  });

  test("products page loads and shows New product button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /products/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /new product/i })).toBeVisible();
  });

  test("can navigate to create product form", async ({ page }) => {
    await page.getByRole("link", { name: /new product/i }).first().click();
    await page.waitForURL("**/admin/products/new");
    await expect(page.getByPlaceholder(/rose perfume oil/i)).toBeVisible({ timeout: 5000 });
  });

  test("can create a new product", async ({ page }) => {
    const productName = `E2E Product ${Date.now()}`;
    await page.getByRole("link", { name: /new product/i }).first().click();
    await page.waitForURL("**/admin/products/new");

    await page.getByPlaceholder(/rose perfume oil/i).fill(productName);
    await page.getByPlaceholder(/describe what makes/i).fill("Test description");
    await page.getByPlaceholder("5000").fill("2500");

    await page.getByRole("button", { name: /create product/i }).click();

    // Should redirect back to products list with new product visible
    await page.waitForURL("**/admin/products", { timeout: 10000 });
    await expect(page.getByText(productName)).toBeVisible({ timeout: 8000 });
  });

  test("shows product list or empty state", async ({ page }) => {
    const productCards = page.getByRole("link", { name: /edit/i });
    const count = await productCards.count();
    if (count === 0) {
      await expect(page.getByText(/no products|add your first|get started/i)).toBeVisible();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  test("product form validates required name before submit", async ({ page }) => {
    await page.getByRole("link", { name: /new product/i }).first().click();
    await page.waitForURL("**/admin/products/new");

    // Fill price but not name — submit should be blocked by browser validation
    await page.getByPlaceholder("5000").fill("1000");
    await page.getByRole("button", { name: /create product/i }).click();

    // Still on new page — name field required
    await expect(page).toHaveURL(/\/admin\/products\/new/);
  });
});
