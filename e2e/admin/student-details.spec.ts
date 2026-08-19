import { test, expect } from "@playwright/test";
import { TEST_JALALI_DATE, uniqueSuffix } from "../helpers/test-data.js";
import { openFirstStudentDetails, waitForStudentsTable } from "../helpers/students.js";
import { confirmModalAction, waitForProfileForm } from "../helpers/modal.js";

test.describe("Student details", () => {
  test.beforeEach(async ({ page }) => {
    const opened = await openFirstStudentDetails(page);
    if (!opened) {
      test.skip(true, "No students in database");
    }
  });

  test("loads profile section and tabs", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "محتوای اختصاصی" }),
    ).toBeVisible();
    await expect(page.getByTestId("tab-reports")).toBeVisible();
    await expect(page.getByTestId("tab-consultations")).toBeVisible();
    await expect(page.getByTestId("tab-content")).toBeVisible();
    await expect(page.getByTestId("tab-online-exams")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "ویرایش پروفایل" }),
    ).toBeVisible();
    await waitForProfileForm(page);
  });

  test("switches between tabs", async ({ page }) => {
    await page.getByTestId("tab-consultations").click();
    await expect(page.getByTestId("add-consultation-btn")).toBeVisible();

    await page.getByTestId("tab-content").click();
    await expect(page.getByTestId("add-content-btn")).toBeVisible();

    await page.getByTestId("tab-reports").click();
    await expect(page.getByTestId("upload-report-btn")).toBeVisible();

    await page.getByTestId("tab-online-exams").click();
    await expect(
      page.getByRole("link", { name: "مدیریت آزمون‌ها" }),
    ).toBeVisible();
  });

  test("profile form shows validation on empty required fields", async ({
    page,
  }) => {
    await waitForProfileForm(page);
    await page.getByTestId("profile-first-name").fill("");
    await page.getByTestId("profile-last-name").fill("");
    await page.getByTestId("profile-save-btn").click();

    await expect(page.getByText("نام الزامی است.")).toBeVisible();
    await expect(page.getByText("نام خانوادگی الزامی است.")).toBeVisible();
  });

  test("updates consultant name and shows success message", async ({ page }) => {
    await waitForProfileForm(page);

    const profileForm = page.locator("form").filter({
      has: page.getByTestId("profile-save-btn"),
    });
    const citySelect = profileForm.locator("select").nth(1);
    if ((await citySelect.inputValue()) === "") {
      await citySelect.selectOption({ index: 1 });
    }

    const consultantInput = page.getByTestId("profile-consultant-name");
    const original = await consultantInput.inputValue();
    const updated = `مشاور تست ${uniqueSuffix()}`;

    await consultantInput.fill(updated);
    await page.getByTestId("profile-save-btn").click();

    await expect(page.getByText("تغییرات با موفقیت ذخیره شد.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(consultantInput).toHaveValue(updated);

    await consultantInput.fill(original);
    await page.getByTestId("profile-save-btn").click();
    await expect(consultantInput).toHaveValue(original, { timeout: 15_000 });
  });

  test("back link returns to students list", async ({ page }) => {
    await page.getByRole("link", { name: "بازگشت به لیست" }).click();
    await expect(page).toHaveURL(/\/admin\/students$/);
  });
});

test.describe("Student consultations tab", () => {
  test.beforeEach(async ({ page }) => {
    const opened = await openFirstStudentDetails(page);
    if (!opened) {
      test.skip(true, "No students in database");
    }
    await page.getByTestId("tab-consultations").click();
  });

  test("add consultation modal validates required fields", async ({ page }) => {
    await page.getByTestId("add-consultation-btn").click();
    await expect(page.getByTestId("add-consultation-modal")).toBeVisible();

    await page
      .getByTestId("add-consultation-modal")
      .getByRole("button", { name: "ثبت" })
      .click();

    await expect(page.getByText("نام مشاور الزامی است.")).toBeVisible();
  });

  test("creates and deletes a consultation", async ({ page }) => {
    const consultantName = `مشاور E2E ${uniqueSuffix()}`;

    await page.getByTestId("add-consultation-btn").click();
    const modal = page.getByTestId("add-consultation-modal");
    await modal.getByPlaceholder("نام مشاور").fill(consultantName);
    await modal.getByPlaceholder("۱۴۰۳/۰۷/۱۸").fill(TEST_JALALI_DATE);
    await modal.locator('input[type="time"]').fill("10:30");
    await modal.getByRole("button", { name: "ثبت" }).click();

    await expect(modal).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(consultantName)).toBeVisible({ timeout: 15_000 });

    await page
      .locator("li")
      .filter({ hasText: consultantName })
      .getByRole("button", { name: "حذف مشاوره" })
      .click();
    await confirmModalAction(page);
    await expect(page.getByText(consultantName)).not.toBeVisible({
      timeout: 15_000,
    });
  });

  test("add consultation modal closes on cancel", async ({ page }) => {
    await page.getByTestId("add-consultation-btn").click();
    await expect(page.getByTestId("add-consultation-modal")).toBeVisible();
    await page
      .getByTestId("add-consultation-modal")
      .getByRole("button", { name: "انصراف" })
      .click();
    await expect(page.getByTestId("add-consultation-modal")).not.toBeVisible();
  });
});

test.describe("Student content tab", () => {
  test.beforeEach(async ({ page }) => {
    const opened = await openFirstStudentDetails(page);
    if (!opened) {
      test.skip(true, "No students in database");
    }
    await page.getByTestId("tab-content").click();
  });

  test("add content modal validates link mode", async ({ page }) => {
    await page.getByTestId("add-content-btn").click();
    const modal = page.getByTestId("add-content-modal");
    await modal.getByRole("button", { name: "لینک" }).click();
    await modal.getByRole("button", { name: "ثبت" }).click();

    await expect(page.getByText("عنوان الزامی است.")).toBeVisible();
  });

  test("adds and deletes a link content item", async ({ page }) => {
    test.setTimeout(90_000);
    const title = `لینک E2E ${uniqueSuffix()}`;
    const url = "https://example.com/e2e-test";

    await page.getByTestId("add-content-btn").click();
    const modal = page.getByTestId("add-content-modal");
    await modal.getByRole("button", { name: "لینک" }).click();
    await modal.getByPlaceholder("عنوان محتوا").fill(title);
    await modal.getByPlaceholder("https://example.com").fill(url);
    await modal.getByRole("button", { name: "ثبت" }).click();

    await expect(modal).not.toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator("li").filter({ hasText: title }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: `حذف ${title}` }).click();
    await confirmModalAction(page);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.locator("li").filter({ hasText: title }),
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test("add content modal closes on cancel", async ({ page }) => {
    await page.getByTestId("add-content-btn").click();
    await page
      .getByTestId("add-content-modal")
      .getByRole("button", { name: "انصراف" })
      .click();
    await expect(page.getByTestId("add-content-modal")).not.toBeVisible();
  });
});

test.describe("Student reports tab", () => {
  test.beforeEach(async ({ page }) => {
    const opened = await openFirstStudentDetails(page);
    if (!opened) {
      test.skip(true, "No students in database");
    }
    await page.getByTestId("tab-reports").click();
  });

  test("upload report modal validates required fields", async ({ page }) => {
    await page.getByTestId("upload-report-btn").click();
    const modal = page.getByTestId("upload-report-modal");
    await modal.getByRole("button", { name: "آپلود" }).click();

    await expect(page.getByText("عنوان گزارش الزامی است.")).toBeVisible();
  });

  test("upload report modal closes on cancel", async ({ page }) => {
    await page.getByTestId("upload-report-btn").click();
    await page
      .getByTestId("upload-report-modal")
      .getByRole("button", { name: "انصراف" })
      .click();
    await expect(page.getByTestId("upload-report-modal")).not.toBeVisible();
  });

  test("uploads a PDF report", async ({ page }) => {
    test.setTimeout(120_000);
    const title = `گزارش E2E ${uniqueSuffix()}`;

    await page.getByTestId("upload-report-btn").click();
    const modal = page.getByTestId("upload-report-modal");
    await modal.getByPlaceholder("مثلاً گزارش هفته اول").fill(title);
    await modal.getByPlaceholder("۱۴۰۳/۰۷/۱۸").fill(TEST_JALALI_DATE);
    await modal.locator('input[type="file"]').setInputFiles("test-upload.pdf");
    await modal.getByRole("button", { name: "آپلود" }).click();

    await expect(modal).not.toBeVisible({ timeout: 90_000 });
    await expect(
      page.locator("li").filter({ hasText: title }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: `حذف ${title}` }).click();
    await confirmModalAction(page);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.locator("li").filter({ hasText: title }),
    ).toHaveCount(0, { timeout: 15_000 });
  });
});
