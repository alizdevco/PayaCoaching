/** Server-side equivalent of src/utils/urlValidation.js for Edge Functions. */

export const INVALID_LINK_URL_MESSAGE = "آدرس لینک معتبر نیست";

export function isSafeExternalUrl(url: unknown): boolean {
  if (url == null || typeof url !== "string") {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
