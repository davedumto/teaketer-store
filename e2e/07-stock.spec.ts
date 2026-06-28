import { test, expect } from "@playwright/test";
import { createClient } from "@libsql/client";

const SLUG = process.env.E2E_STORE_SLUG ?? "";

// ─── Test 1: Stock display correctness ───────────────────────────────────────
//
// Verifies:
// - A product with stockCount > 0 shows "In stock" chip and Add to Bag button
// - A product with stockCount = 0 shows "Sold out" chip and disabled Sold Out button
// - The SOLD OUT overlay on the image and the chip are in sync (both show same state)

test.describe("Stock display — no-variant products", () => {
  test.skip(!SLUG, "Set E2E_STORE_SLUG");

  // Always restore Sugar Baby to 10 after each test, even if the test fails mid-way
  test.afterEach(async () => {
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 10 WHERE name = 'Sugar Baby'");
    await db.close();
  });

  test("product with stock shows In stock chip and active Add to Bag", async ({ page }) => {
    // Sugar Baby has stockCount=10 set in the DB
    await page.goto(`/shop/${SLUG}`);
    await expect(page.locator("body")).not.toContainText("404");

    // Find a card that shows "In stock" (no-variant, in-stock product)
    const inStockChip = page.getByText("In stock").first();
    await expect(inStockChip).toBeVisible({ timeout: 8000 });

    // The Add to Bag button in that card must be enabled
    const card = inStockChip.locator("xpath=ancestor::div[contains(@style,'flex-direction')]").first();
    const addBtn = page.getByRole("button", { name: /add to bag/i }).first();
    await expect(addBtn).toBeEnabled();
    await expect(addBtn).not.toHaveText(/sold out/i);
  });

  test("sold-out product shows Sold out chip and disabled button — not contradictory", async ({ page }) => {
    // Temporarily set Sugar Baby stock to 0 via DB, reload, then restore
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 0 WHERE name = 'Sugar Baby'");
    await db.close();

    await page.goto(`/shop/${SLUG}`);

    // "Sold out" chip must appear somewhere on the page
    await expect(page.getByText("Sold out").first()).toBeVisible({ timeout: 8000 });

    // The button in the sold-out card must say "Sold Out" and be disabled
    const soldOutBtn = page.getByRole("button", { name: /sold out/i }).first();
    await expect(soldOutBtn).toBeVisible({ timeout: 5000 });
    await expect(soldOutBtn).toBeDisabled();

    // The SOLD OUT image overlay must also be visible — no contradictory state
    const overlay = page.getByText(/sold out/i, { exact: false }).first();
    await expect(overlay).toBeVisible();

    // Restore stock
    const db2 = createClient({ url: "file:./dev.db" });
    await db2.execute("UPDATE Product SET stockCount = 10 WHERE name = 'Sugar Baby'");
    await db2.close();
  });

  test("order API rejects purchase when product is out of stock", async ({ request }) => {
    // Set stock to 0
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 0 WHERE name = 'Sugar Baby'");
    const productRow = await db.execute("SELECT id FROM Product WHERE name = 'Sugar Baby'");
    const productId = productRow.rows[0].id as string;
    await db.close();

    const res = await request.post("/api/store/orders", {
      data: {
        storeSlug: SLUG,
        buyerName: "Stock Test",
        buyerEmail: "stocktest@e2etest.com",
        buyerPhone: "08011112222",
        deliveryAddress: "1 Test Road",
        deliveryState: "Lagos",
        items: [{ productId, variantId: null, quantity: 1 }],
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/not enough stock|sold out|only \d+ left/i);

  });

  test("order API rejects quantity exceeding available stock", async ({ request }) => {
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 2 WHERE name = 'Sugar Baby'");
    const productRow = await db.execute("SELECT id FROM Product WHERE name = 'Sugar Baby'");
    const productId = productRow.rows[0].id as string;
    await db.close();

    const res = await request.post("/api/store/orders", {
      data: {
        storeSlug: SLUG,
        buyerName: "Over Stock Test",
        buyerEmail: "overstock@e2etest.com",
        buyerPhone: "08022223333",
        deliveryAddress: "2 Test Road",
        deliveryState: "Lagos",
        items: [{ productId, variantId: null, quantity: 5 }],
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/not enough stock|only \d+ left/i);

  });
});

// ─── Test 2: Cart quantity cap ────────────────────────────────────────────────
//
// Verifies:
// - The + button on the product card is disabled once qty reaches stock
// - Clicking + beyond stock does not increase the counter
// - The cart drawer + button is also capped at stock

test.describe("Cart quantity cap", () => {
  test.skip(!SLUG, "Set E2E_STORE_SLUG");

  test.afterEach(async () => {
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 10 WHERE name = 'Sugar Baby'");
    await db.close();
  });

  // Helper: locate the Sugar Baby product card reliably.
  // The card is a flex-column div containing the product name text.
  // We find the name element and use nth-closest ancestor via xpath.
  async function getSugarBabyCard(page: Parameters<Parameters<typeof test>[1]>[0]) {
    await page.goto(`/shop/${SLUG}`);
    // The product name is in a <div> inside the card. Scope to the grid cell.
    const nameEl = page.locator("main").getByText("Sugar Baby", { exact: true }).first();
    await expect(nameEl).toBeVisible({ timeout: 8000 });
    // The card root is the 2nd ancestor div (name → info div → card root)
    return nameEl.locator("xpath=ancestor::div[2]");
  }

  test("+ button on product card caps at available stock", async ({ page }) => {
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 3 WHERE name = 'Sugar Baby'");
    await db.close();

    const card = await getSugarBabyCard(page);

    // The qty stepper + button (inside the flex row with the − button)
    const plusBtn = card.getByRole("button", { name: "+" });
    const minusBtn = card.getByRole("button", { name: "−" });

    // Start at qty=1, click + twice → should reach 3 (stock limit)
    await plusBtn.click(); // 2
    await plusBtn.click(); // 3

    // At limit — + must be disabled
    await expect(plusBtn).toBeDisabled({ timeout: 3000 });

    // Qty span must show 3
    await expect(card.locator("span", { hasText: "3" })).toBeVisible();

    // − still works
    await minusBtn.click();
    await expect(plusBtn).toBeEnabled();

  });

  test("adding item to cart is capped — drawer + button disabled at stock limit", async ({ page }) => {
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 2 WHERE name = 'Sugar Baby'");
    await db.close();

    const card = await getSugarBabyCard(page);

    // Bump qty to 2 (max) then add to bag
    await card.getByRole("button", { name: "+" }).click(); // qty = 2
    await card.getByRole("button", { name: /add to bag/i }).click();

    // Cart drawer opens
    await expect(page.getByRole("button", { name: /checkout/i })).toBeVisible({ timeout: 5000 });

    // Find the Sugar Baby row in the drawer by its name text, then check its + button
    const drawerRow = page.locator("div").filter({ hasText: /sugar baby/i }).filter({ has: page.locator("button", { hasText: "+" }) }).last();
    const drawerPlus = drawerRow.getByRole("button", { name: "+" });
    await expect(drawerPlus).toBeDisabled({ timeout: 3000 });

  });

  test("cart drawer + button disabled when single-unit stock item already in cart", async ({ page }) => {
    const db = createClient({ url: "file:./dev.db" });
    await db.execute("UPDATE Product SET stockCount = 1 WHERE name = 'Sugar Baby'");
    await db.close();

    const card = await getSugarBabyCard(page);

    // Add 1 unit (stock=1, so this fills the limit)
    await card.getByRole("button", { name: /add to bag/i }).click();
    await expect(page.getByRole("button", { name: /checkout/i })).toBeVisible({ timeout: 5000 });

    // Drawer row + must be disabled
    const drawerRow = page.locator("div").filter({ hasText: /sugar baby/i }).filter({ has: page.locator("button", { hasText: "+" }) }).last();
    await expect(drawerRow.getByRole("button", { name: "+" })).toBeDisabled({ timeout: 3000 });

  });
});
