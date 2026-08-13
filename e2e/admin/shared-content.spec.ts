import { test, expect } from "@playwright/test";
import { TEST_PDF_PATH, uniqueSuffix } from "../helpers/test-data.js";

test.describe("Shared content upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/shared-content");
    await expect(
      page.getByRole("heading", { name: "محتوای مشترک" }),
    ).toBeVisible();
  });

  test("loads form with content type selectors", async ({ page }) => {
    await expect(page.getByTestId("shared-content-form")).toBeVisible();
    await expect(page.getByTestId("content-type-video")).toBeVisible();
    await expect(page.getByTestId("content-type-pdf")).toBeVisible();
    await expect(page.getByTestId("content-type-image")).toBeVisible();
    await expect(page.getByTestId("content-type-report")).toBeVisible();
    await expect(page.getByTestId("shared-content-title")).toBeVisible();
    await expect(page.getByTestId("shared-content-file")).toBeVisible();
    await expect(page.getByTestId("shared-content-submit")).toBeVisible();
  });

  test("switches content type and shows hint", async ({ page }) => {
    await page.getByTestId("content-type-pdf").click();
    await expect(page.getByText("فقط PDF، حداکثر ۵۰ مگابایت")).toBeVisible();

    await page.getByTestId("content-type-image").click();
    await expect(
      page.getByText("JPG، PNG یا WEBP، حداکثر ۲۰ مگابایت"),
    ).toBeVisible();
  });

  test("validates required fields on submit", async ({ page }) => {
    await page.getByTestId("shared-content-submit").click();
    await expect(page.getByText("عنوان الزامی است.")).toBeVisible();
  });

  test("validates file is required", async ({ page }) => {
    await page.getByTestId("shared-content-title").fill(`محتوای مشترک ${uniqueSuffix()}`);
    await page.getByTestId("shared-content-submit").click();
    await expect(page.getByText("فایل را انتخاب کنید.")).toBeVisible();
  });

  test("validates wrong file type for selected content type", async ({
    page,
  }) => {
    await page.getByTestId("content-type-video").click();
    await page.getByTestId("shared-content-title").fill(`ویدیو E2E ${uniqueSuffix()}`);
    await page.getByTestId("shared-content-file").setInputFiles(TEST_PDF_PATH);
    await page.getByTestId("shared-content-submit").click();

    await expect(
      page.getByText(/فرمت فایل با نوع محتوای «ویدیو» مطابقت ندارد/),
    ).toBeVisible();
  });

  test("uploads PDF shared content successfully", async ({ page }) => {
    test.setTimeout(120_000);
    const title = `PDF مشترک E2E ${uniqueSuffix()}`;

    await page.getByTestId("content-type-pdf").click();
    await page.getByTestId("shared-content-title").fill(title);
    await page.getByTestId("shared-content-file").setInputFiles(TEST_PDF_PATH);
    await page.getByTestId("shared-content-submit").click();

    await expect(
      page.getByText(/فایل با موفقیت آپلود شد و برای .* دانش‌آموز ثبت شد/),
    ).toBeVisible({ timeout: 90_000 });
  });
});
