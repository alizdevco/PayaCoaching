// Iranian mobile numbers: exactly 11 digits, starts with 09 (e.g. 09123456789).

export const IRANIAN_PHONE_PATTERN = /^09\d{9}$/;

export function trimIranianPhone(raw) {
  return String(raw ?? "").trim();
}

export function validateIranianPhone(raw) {
  const trimmed = trimIranianPhone(raw);

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

  if (!trimmed.startsWith("09")) {
    return { valid: false, message: "شماره موبایل باید با 09 شروع شود." };
  }

  return { valid: true, phone: trimmed };
}

// Convert local format (09123456789) to E.164 for Supabase Auth (+989123456789).
export function toSupabasePhone(localPhone) {
  const result = validateIranianPhone(localPhone);
  if (!result.valid) {
    throw new Error(result.message);
  }
  return "+98" + result.phone.slice(1);
}

// Canonical digits-only form for comparing phones across formats (989123456789).
export function toCanonicalPhoneDigits(rawPhone) {
  const digits = String(rawPhone ?? "").replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("09")) {
    return "98" + digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith("98")) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return "98" + digits;
  }

  const validated = validateIranianPhone(rawPhone);
  if (validated.valid) {
    return "98" + validated.phone.slice(1);
  }

  return digits;
}

// Known stored variants when querying profiles.phone (legacy rows may differ).
export function phoneLookupVariants(rawPhone) {
  const canonical = toCanonicalPhoneDigits(rawPhone);
  if (!canonical) return [];

  const local = "0" + canonical.slice(2);
  const e164 = "+" + canonical;
  return [...new Set([canonical, e164, local])];
}

export const PHONE_ALREADY_REGISTERED_MESSAGE =
  "این شماره قبلاً ثبت‌نام شده است. برای ورود به صفحه لاگین مراجعه کنید.";
