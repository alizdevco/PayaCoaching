import { test, expect } from "@playwright/test";
import { loginAsAdmin, logoutAdmin } from "../helpers/auth.js";

/**
 * Isolated logout test — must NOT share storageState with other admin tests
 * because signOut() revokes the Supabase refresh token on the server.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("logs out and returns to login page", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByTestId("dashboard-title")).toBeVisible();
  await logoutAdmin(page);
  await expect(page.getByRole("heading", { name: "ورود" })).toBeVisible();
});
