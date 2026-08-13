import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Confirm a destructive action inside the open modal dialog. */
export async function confirmModalAction(page: Page, label = "حذف") {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: label, exact: true }).click();
}

/** Wait until the student profile edit form has loaded (skeleton gone). */
export async function waitForProfileForm(page: Page) {
  await expect(page.getByTestId("profile-save-btn")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
}
