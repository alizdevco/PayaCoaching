import { test, expect } from "@playwright/test";

test.describe("Admin dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
  });

  test("loads dashboard with title and summary", async ({ page }) => {
    await expect(page.getByTestId("dashboard-title")).toHaveText("داشبورد");
    await expect(page.getByText("خلاصه وضعیت سیستم")).toBeVisible();
    await expect(page.getByText("آمار کلی")).toBeVisible();
    await expect(page.getByText("دسترسی سریع")).toBeVisible();
  });

  test("displays stat cards after loading", async ({ page }) => {
    await expect(page.getByTestId("stat-students")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("stat-reports")).toBeVisible();
    await expect(page.getByTestId("stat-exams")).toBeVisible();

    await expect(page.getByText("تعداد دانش‌آموزان")).toBeVisible();
    await expect(page.getByText("گزارش‌های آپلود شده")).toBeVisible();
    await expect(page.getByText("آزمون‌های منتشر شده")).toBeVisible();
  });

  test("quick action navigates to students page", async ({ page }) => {
    await page.getByTestId("quick-students").click();
    await expect(page).toHaveURL(/\/admin\/students$/);
    await expect(
      page.getByRole("heading", { name: "دانش‌آموزان" }),
    ).toBeVisible();
  });

  test("quick action navigates to exams page", async ({ page }) => {
    await page.getByTestId("quick-exams").click();
    await expect(page).toHaveURL(/\/admin\/exams$/);
    await expect(
      page.getByRole("heading", { name: "تحلیل آزمون" }),
    ).toBeVisible();
  });

  test("sidebar navigation links work", async ({ page }) => {
    await page.getByTestId("nav-students").click();
    await expect(page).toHaveURL(/\/admin\/students$/);

    await page.getByTestId("nav-exams").click();
    await expect(page).toHaveURL(/\/admin\/exams$/);

    await page.getByTestId("nav-shared-content").click();
    await expect(page).toHaveURL(/\/admin\/shared-content$/);

    await page.getByTestId("nav-dashboard").click();
    await expect(page).toHaveURL(/\/admin\/?$/);
  });
});
