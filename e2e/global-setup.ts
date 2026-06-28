import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@libsql/client";

async function globalSetup(config: FullConfig) {
  // 1. Clear rate limits so login isn't blocked
  const db = createClient({ url: "file:./dev.db" });
  await db.execute("DELETE FROM RateLimit");
  await db.close();
  console.log("✓ Rate limits cleared");

  // 2. Log in once and save auth state — all tests reuse this cookie
  const email = process.env.E2E_VENDOR_EMAIL;
  const password = process.env.E2E_VENDOR_PASSWORD;
  if (!email || !password) {
    console.log("⚠ E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD not set — skipping auth setup");
    return;
  }

  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3001";
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/admin/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/admin/dashboard", { timeout: 15000 });

  await page.context().storageState({ path: "e2e/.auth-state.json" });
  await browser.close();
  console.log("✓ Auth state saved");
}

export default globalSetup;
