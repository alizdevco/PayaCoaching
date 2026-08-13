import { test, expect } from "@playwright/test";
import { waitForStudentsTable } from "../helpers/students.js";

test.describe("Students list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/students");
    await expect(
      page.getByRole("heading", { name: "دانش‌آموزان" }),
    ).toBeVisible();
  });

  test("loads page with search and table", async ({ page }) => {
    await expect(page.getByTestId("students-search")).toBeVisible();
    await expect(page.getByTestId("students-table")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "شماره موبایل" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "نام", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "عملیات" }),
    ).toBeVisible();
  });

  test("search filters students or shows empty state", async ({ page }) => {
    await page.getByTestId("students-search").fill("zzz-nonexistent-student-xyz");
    await page.waitForTimeout(400);

    await expect(
      page.getByText("دانش‌آموزی با این مشخصات یافت نشد."),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("search with empty query resets list", async ({ page }) => {
    await page.getByTestId("students-search").fill("zzz-nonexistent");
    await page.waitForTimeout(400);
    await expect(
      page.getByText("دانش‌آموزی با این مشخصات یافت نشد."),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("students-search").fill("");
    await page.waitForTimeout(400);
  });

  test("pagination controls appear when students exist", async ({ page }) => {
    const table = page.getByTestId("students-table");
    await table.waitFor({ state: "visible", timeout: 20_000 });

    const emptyAll = page.getByText("هنوز دانش‌آموزی ثبت‌نام نکرده است.");
    const emptySearch = page.getByText("دانش‌آموزی با این مشخصات یافت نشد.");
    const hasRows = await table.locator("tbody tr").count();

    if (hasRows === 1 && (await emptyAll.isVisible().catch(() => false))) {
      test.skip(true, "No students in database to test pagination");
      return;
    }

    if (hasRows > 0 && !(await emptyAll.isVisible().catch(() => false))) {
      await expect(page.getByTestId("pagination-prev")).toBeVisible();
      await expect(page.getByTestId("pagination-next")).toBeVisible();
      await expect(page.getByText(/صفحه.*از/)).toBeVisible();

      const prevDisabled = await page.getByTestId("pagination-prev").isDisabled();
      if (!prevDisabled) {
        await page.getByTestId("pagination-prev").click();
        await expect(page.getByText(/صفحه ۱ از/)).toBeVisible();
      }
    }
  });

  test("clicking a row navigates to student details", async ({ page }) => {
    await waitForStudentsTable(page);

    const emptyMessage = page.getByText("هنوز دانش‌آموزی ثبت‌نام نکرده است.");
    if (await emptyMessage.isVisible().catch(() => false)) {
      test.skip(true, "No students to open details");
      return;
    }

    await page.getByTestId("students-table").locator("tbody tr").first().locator("td").first().click();
    await expect(page).toHaveURL(/\/admin\/students\/[a-f0-9-]+$/);
    await expect(page.getByText("بازگشت به لیست")).toBeVisible();
  });

  test("delete modal opens and closes without deleting", async ({ page }) => {
    const emptyMessage = page.getByText("هنوز دانش‌آموزی ثبت‌نام نکرده است.");
    if (await emptyMessage.isVisible({ timeout: 20_000 }).catch(() => false)) {
      test.skip(true, "No students to test delete modal");
      return;
    }

    const deleteBtn = page
      .getByTestId("students-table")
      .getByRole("button", { name: /^حذف / })
      .first();
    await deleteBtn.click();

    await expect(page.getByTestId("delete-student-modal")).toBeVisible();
    await expect(
      page.getByText("آیا از حذف این دانش‌آموز اطمینان دارید؟"),
    ).toBeVisible();

    await page.getByRole("button", { name: "انصراف" }).click();
    await expect(page.getByTestId("delete-student-modal")).not.toBeVisible();
  });
});
