import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth.js";

test.describe("Admin authentication", () => {
  test.describe("Protected routes", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("redirects unauthenticated users from /admin to login", async ({
      page,
    }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "ورود" })).toBeVisible();
    });

    test("redirects unauthenticated users from /admin/students to login", async ({
      page,
    }) => {
      await page.goto("/admin/students");
      await expect(page).toHaveURL(/\/login$/);
    });

    test("redirects unauthenticated users from /admin/exams to login", async ({
      page,
    }) => {
      await page.goto("/admin/exams");
      await expect(page).toHaveURL(/\/login$/);
    });

    test("redirects unauthenticated users from /admin/shared-content to login", async ({
      page,
    }) => {
      await page.goto("/admin/shared-content");
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test.describe("Login flow", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("shows validation errors for empty login form", async ({ page }) => {
      await page.goto("/login");
      await page.getByTestId("login-submit").click();

      await expect(page.getByText("این فیلد الزامی است.")).toBeVisible();
      await expect(page.getByText("رمز عبور الزامی است.")).toBeVisible();
    });

    test("shows error for invalid credentials", async ({ page }) => {
      await page.goto("/login");
      await page.getByTestId("login-identifier").fill("wrong@example.com");
      await page.getByTestId("login-password").fill("wrongpassword");
      await page.getByTestId("login-submit").click();

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText("شماره/ایمیل یا رمز عبور نادرست است.")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("logs in with valid admin credentials and lands on dashboard", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await expect(page.getByTestId("dashboard-title")).toBeVisible();
      await expect(page.getByText("خلاصه وضعیت سیستم")).toBeVisible();
    });
  });

  test("shows logout button in admin sidebar", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("dashboard-title")).toBeVisible();
    await expect(page.getByTestId("admin-logout")).toBeVisible();
    await expect(page.getByTestId("admin-logout")).toHaveText(/خروج/);
  });
});
