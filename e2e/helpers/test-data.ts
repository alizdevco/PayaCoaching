/** Unique suffix for test data to avoid collisions across runs. */
export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** A valid Jalali date string for JalaliDateInput (maps to a real Gregorian ISO date). */
export const TEST_JALALI_DATE = "1403/07/18";

export const TEST_PDF_PATH = "test-upload.pdf";
