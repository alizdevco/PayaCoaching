export const OTP_COOLDOWN_SECONDS = 120;
export const OTP_COOLDOWN_MS = OTP_COOLDOWN_SECONDS * 1000;
export const OTP_COOLDOWN_STORAGE_KEY = "otp_cooldown";
export const OTP_COOLDOWN_RESET_STORAGE_KEY = "otp_cooldown_reset";
export const OTP_COOLDOWN_ERROR =
  "کد تأیید قبلاً ارسال شده است. لطفاً ۲ دقیقه صبر کنید.";

export function readOtpCooldown(storageKey = OTP_COOLDOWN_STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.phone || typeof parsed.sentAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOtpCooldown(
  phone,
  sentAt = Date.now(),
  storageKey = OTP_COOLDOWN_STORAGE_KEY,
) {
  localStorage.setItem(storageKey, JSON.stringify({ phone, sentAt }));
}

export function clearOtpCooldown(storageKey = OTP_COOLDOWN_STORAGE_KEY) {
  localStorage.removeItem(storageKey);
}

export function getStoredCooldownSeconds(
  phoneNumber,
  storageKey = OTP_COOLDOWN_STORAGE_KEY,
) {
  const stored = readOtpCooldown(storageKey);
  if (!stored || stored.phone !== phoneNumber) return 0;
  const remainingMs = OTP_COOLDOWN_MS - (Date.now() - stored.sentAt);
  if (remainingMs <= 0) {
    clearOtpCooldown(storageKey);
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

export function getRemainingCooldownSeconds(
  sentAtMap,
  phoneNumber,
  storageKey = OTP_COOLDOWN_STORAGE_KEY,
) {
  const storedRemaining = getStoredCooldownSeconds(phoneNumber, storageKey);
  if (storedRemaining > 0) return storedRemaining;

  const sentAt = sentAtMap.get(phoneNumber);
  if (!sentAt) return 0;
  const remainingMs = OTP_COOLDOWN_MS - (Date.now() - sentAt);
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export function getOtpStepInitialCooldown(
  phoneNumber,
  fallbackSeconds,
  storageKey = OTP_COOLDOWN_STORAGE_KEY,
) {
  const storedRemaining = getStoredCooldownSeconds(phoneNumber, storageKey);
  if (storedRemaining > 0) return storedRemaining;
  return fallbackSeconds > 0 ? fallbackSeconds : OTP_COOLDOWN_SECONDS;
}
