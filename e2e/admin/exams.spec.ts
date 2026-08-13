import { test, expect } from "@playwright/test";
import { TEST_PDF_PATH, uniqueSuffix } from "../helpers/test-data.js";
import { uniqueJalaliExamDate } from "../helpers/students.js";
import { confirmModalAction } from "../helpers/modal.js";

test.describe("Exam management list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/exams");
    await expect(
      page.getByRole("heading", { name: "تحلیل آزمون" }),
    ).toBeVisible();
  });

  test("loads exams table and new exam button", async ({ page }) => {
    await expect(page.getByTestId("new-exam-btn")).toBeVisible();
    await expect(page.getByTestId("exams-table")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "تاریخ آزمون" }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "عنوان" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "وضعیت" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "عملیات" })).toBeVisible();
  });

  test("opens create exam form", async ({ page }) => {
    await page.getByTestId("new-exam-btn").click();
    await expect(page.getByTestId("exam-form")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "آزمون جدید" }),
    ).toBeVisible();
    await expect(page.getByLabel("تاریخ آزمون")).toBeVisible();
    await expect(page.getByLabel("عنوان")).toBeVisible();
    await expect(page.getByLabel("متن تحلیل")).toBeVisible();
  });

  test("create form validates required fields", async ({ page }) => {
    await page.getByTestId("new-exam-btn").click();
    await page.getByRole("button", { name: "ایجاد تحلیل" }).click();

    await expect(page.getByText("تاریخ آزمون الزامی است.")).toBeVisible();
    await expect(page.getByText("عنوان الزامی است.")).toBeVisible();
    await expect(page.getByText("متن تحلیل الزامی است.")).toBeVisible();
  });

  test("back button returns to list from create form", async ({ page }) => {
    await page.getByTestId("new-exam-btn").click();
    await page.getByRole("button", { name: "بازگشت به لیست" }).click();
    await expect(page.getByTestId("exams-table")).toBeVisible();
  });
});

test.describe("Exam CRUD lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  const examTitle = `تحلیل E2E ${uniqueSuffix()}`;

  test("creates, edits, publishes, and deletes an exam", async ({ page }) => {
    test.setTimeout(120_000);
    const examJalaliDate = uniqueJalaliExamDate();

    await page.goto("/admin/exams");
    await page.getByTestId("new-exam-btn").click();

    await page.getByLabel("تاریخ آزمون").fill(examJalaliDate);
    await page.getByLabel("عنوان").fill(examTitle);
    await page.getByLabel("توضیح کوتاه (اختیاری)").fill("توضیح تست E2E");
    await page.getByLabel("متن تحلیل").fill("متن تحلیل آزمون برای تست E2E");
    await page.getByRole("button", { name: "ایجاد تحلیل" }).click();

    const fileSection = page.getByRole("heading", { name: "فایل‌های تحلیل" });
    const duplicateMsg = page.getByText("تحلیل آزمونی با این تاریخ از قبل وجود دارد.");

    await expect(fileSection.or(duplicateMsg)).toBeVisible({ timeout: 30_000 });

    if (await duplicateMsg.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "بازگشت به لیست" }).click();
      test.skip(true, "Exam date collision — re-run or use a different date");
      return;
    }

    const addPdfBtn = page.getByRole("button", { name: "افزودن فایل" }).nth(1);
    await addPdfBtn.click();
    await page.locator('input[type="file"][accept*="pdf"]').last().setInputFiles(TEST_PDF_PATH);

    await expect(
      page.getByText(/فایل.*با موفقیت آپلود شد/),
    ).toBeVisible({ timeout: 60_000 });

    const updatedTitle = `${examTitle} — ویرایش`;
    await page.getByLabel("عنوان").fill(updatedTitle);
    await page.getByLabel("منتشر شده (قابل مشاهده عمومی)").check();
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    await expect(page.getByText("تغییرات با موفقیت ذخیره شد.")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "بازگشت به لیست" }).click();
    await expect(page.getByTestId("exams-table")).toBeVisible();
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 15_000 });

    const row = page.getByRole("row").filter({ hasText: updatedTitle });
    await expect(row.getByText("منتشر شده")).toBeVisible();
    await row.getByRole("button", { name: "لغو انتشار" }).click();
    await expect(row.getByText("پیش‌نویس")).toBeVisible({ timeout: 15_000 });

    await row.getByRole("button", { name: "ویرایش", exact: true }).click();
    await expect(page.getByRole("heading", { name: "ویرایش تحلیل آزمون" })).toBeVisible();

    await page.getByRole("button", { name: "بازگشت به لیست" }).click();
    await row.getByRole("button", { name: `حذف ${updatedTitle}` }).click();
    await confirmModalAction(page);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByTestId("exams-table").getByText(updatedTitle, { exact: true }),
    ).toHaveCount(0, { timeout: 15_000 });
  });
});

test.describe("Exam delete modal", () => {
  test("opens and closes delete confirmation without deleting", async ({
    page,
  }) => {
    await page.goto("/admin/exams");
    await page.getByTestId("exams-table").waitFor({ state: "visible", timeout: 20_000 });

    const empty = page.getByText("هنوز تحلیل آزمونی ثبت نشده است.");
    if (await empty.isVisible().catch(() => false)) {
      test.skip(true, "No exams to test delete modal");
      return;
    }

    const deleteBtn = page
      .getByTestId("exams-table")
      .getByRole("button", { name: /^حذف / })
      .first();
    await deleteBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "انصراف" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
