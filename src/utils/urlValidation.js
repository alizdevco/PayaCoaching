export const INVALID_LINK_URL_MESSAGE = "آدرس لینک معتبر نیست";

export const UNSAFE_LINK_OPEN_MESSAGE =
  "این لینک معتبر نیست و باز نمی‌شود.";

/**
 * Returns true only for parseable http: or https: URLs.
 * Uses URL parsing (not string prefix checks) so encoded or padded input
 * cannot bypass validation.
 */
export function isSafeExternalUrl(url) {
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

export function assertSafeExternalUrl(url) {
  if (!isSafeExternalUrl(url)) {
    throw new Error(INVALID_LINK_URL_MESSAGE);
  }
}
