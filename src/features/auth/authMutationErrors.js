// Safe, user-facing error messages for auth/profile mutations.
// Never expose passwords, tokens, stack traces, or raw Supabase internals.

const NETWORK_ERROR_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "err_internet_disconnected",
  "err_network_changed",
  "fetch failed",
];

const INTERNAL_PLATFORM_ERROR_PATTERNS = [
  "edge function",
  "non-2xx status code",
  "functionsfetcherror",
  "functionshttperror",
];

function isInternalPlatformError(error) {
  const message = String(error?.message ?? "").toLowerCase();

  const name = String(error?.name ?? "").toLowerCase();

  return (
    INTERNAL_PLATFORM_ERROR_PATTERNS.some((pattern) =>
      message.includes(pattern),
    ) ||
    INTERNAL_PLATFORM_ERROR_PATTERNS.some((pattern) => name.includes(pattern))
  );
}

export function isNetworkError(error) {
  if (!error) {
    return false;
  }

  if (error.name === "AuthRetryableFetchError") {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  const message = String(error.message ?? "").toLowerCase();

  return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function isAuthSessionError(error) {
  const message = String(error?.message ?? "").toLowerCase();

  const code = String(error?.code ?? "").toLowerCase();

  return (
    code === "pgrst301" ||
    code === "pgrst302" ||
    code === "pgrst303" ||
    message.includes("jwt expired") ||
    message.includes("not authenticated") ||
    (message.includes("session") && message.includes("expired")) ||
    error?.status === 401
  );
}

/**
 * PostgREST .single() when zero (or multiple) rows are returned —
 * profile missing or RLS hides it.
 */
export function isProfileNotFoundError(error) {
  return String(error?.code ?? "").toUpperCase() === "PGRST116";
}

/**
 * Errors where clearing profile is correct;
 * everything else is treated as transient.
 */
export function isDefinitiveProfileLoadFailure(error) {
  if (isProfileNotFoundError(error) || isAuthSessionError(error)) {
    return true;
  }

  const status = Number(error?.status);

  return status === 403;
}

export function getAuthMutationErrorMessage(error, context) {
  if (isInternalPlatformError(error)) {
    return "اتصال برقرار نشد یا پاسخ سرور دریافت نشد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.";
  }

  if (isNetworkError(error)) {
    return "اتصال برقرار نشد یا پاسخ سرور دریافت نشد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.";
  }

  if (isAuthSessionError(error)) {
    return "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
  }

  switch (context) {
    case "login":
      return "شماره/ایمیل یا رمز عبور نادرست است.";

    case "otp-send":
      if (error?.message && !error?.status && !isInternalPlatformError(error)) {
        const code = String(error?.code ?? "");

        if (!code || code.startsWith("PGRST")) {
          return error.message;
        }
      }

      return "ارسال کد تأیید ناموفق بود. لطفاً دوباره تلاش کنید.";

    case "otp-verify":
      return "کد تأیید نادرست است یا منقضی شده. لطفاً دوباره تلاش کنید.";

    case "profile":
      return "ذخیره پروفایل ناموفق بود. لطفاً دوباره تلاش کنید.";

    case "register":
      return "ثبت‌نام ناموفق بود. لطفاً دوباره تلاش کنید.";

    case "password-reset":
      return "تغییر رمز عبور ناموفق بود. لطفاً دوباره تلاش کنید.";

    default:
      return "عملیات ناموفق بود. لطفاً دوباره تلاش کنید.";
  }
}
