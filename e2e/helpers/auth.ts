import type { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set in .env.test",
    );
  }

  await page.goto("/login");
  await page.getByTestId("login-identifier").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
}

export async function logoutAdmin(page: Page) {
  await page.getByTestId("admin-logout").click();
  await page.waitForURL(/\/login/, { timeout: 15_000 });
}
