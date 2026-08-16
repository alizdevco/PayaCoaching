/** Iranian phone validation — mirrors src/features/auth/phoneValidation.js */

export const PHONE_ALREADY_REGISTERED_MESSAGE =
  "این شماره قبلاً ثبت‌نام شده است. برای ورود به صفحه لاگین مراجعه کنید.";

export const PHONE_NOT_REGISTERED_MESSAGE = "این شماره در سیستم یافت نشد";

export const INCOMPLETE_REGISTRATION_MESSAGE =
  "ثبت‌نام شما تکمیل نشده. لطفاً از صفحه ثبت‌نام ادامه دهید.";

export const OTP_RATE_LIMIT_MESSAGE =
  "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.";

const IRANIAN_PHONE_PATTERN = /^09\d{9}$/;

export type PhoneValidationResult =
  | { valid: true; phone: string }
  | { valid: false; message: string };

export function validateIranianPhone(raw: unknown): PhoneValidationResult {
  const trimmed = String(raw ?? "").trim();

  if (!trimmed) {
    return { valid: false, message: "شماره موبایل الزامی است." };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, message: "شماره موبایل نباید شامل فاصله باشد." };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, message: "شماره موبایل فقط باید شامل رقم باشد." };
  }
  if (trimmed.length !== 11) {
    return { valid: false, message: "شماره موبایل باید دقیقاً ۱۱ رقم باشد." };
  }
  if (!IRANIAN_PHONE_PATTERN.test(trimmed)) {
    return { valid: false, message: "شماره موبایل باید با 09 شروع شود." };
  }

  return { valid: true, phone: trimmed };
}

export function toSupabasePhone(localPhone: string): string {
  return "+98" + localPhone.slice(1);
}

export function toCanonicalPhoneDigits(rawPhone: string): string {
  const digits = String(rawPhone).replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("09")) {
    return "98" + digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith("98")) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return "98" + digits;
  }

  return digits;
}
