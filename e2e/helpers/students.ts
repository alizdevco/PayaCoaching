import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Wait until the students table has finished loading (no skeleton rows). */
export async function waitForStudentsTable(page: Page) {
  await expect(page.getByTestId("students-table")).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByTestId("students-table").locator(".animate-pulse"),
  ).toHaveCount(0, { timeout: 20_000 });
}

/** Navigate to the first student details page. Returns false if no students exist. */
export async function openFirstStudentDetails(page: Page): Promise<boolean> {
  await page.goto("/admin/students");
  await waitForStudentsTable(page);

  const emptyMessage = page.getByText("هنوز دانش‌آموزی ثبت‌نام نکرده است.");
  if (await emptyMessage.isVisible().catch(() => false)) {
    return false;
  }

  const firstRow = page.getByTestId("students-table").locator("tbody tr").first();
  await firstRow.locator("td").first().click();
  await expect(page).toHaveURL(/\/admin\/students\/[a-f0-9-]+$/);
  return true;
}

/** Pick a pseudo-random Jalali date unlikely to collide with existing exams. */
export function uniqueJalaliExamDate() {
  const seed = Date.now() % 20;
  return `1403/08/${String(seed + 1).padStart(2, "0")}`;
}
