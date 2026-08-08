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
