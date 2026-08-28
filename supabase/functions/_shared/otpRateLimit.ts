import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { OTP_RATE_LIMIT_MESSAGE } from "./phoneValidation.ts";

export type OtpPurpose = "registration" | "password_reset";

const GLOBAL_SMS_LIMIT = 200;
const GLOBAL_SMS_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const PHONE_LIMIT = 5;
const PHONE_WINDOW_MS = 15 * 60 * 1000;
const IP_LIMIT = 30;
const IP_WINDOW_MS = 60 * 60 * 1000;

export class OtpRateLimitError extends Error {
  constructor() {
    super(OTP_RATE_LIMIT_MESSAGE);
    this.name = "OtpRateLimitError";
  }
}

/** Records the attempt after limits pass; throws OtpRateLimitError when exceeded. */
export async function assertOtpRateLimit(
  supabase: SupabaseClient,
  purpose: OtpPurpose,
  phoneDigits: string,
  clientIp: string | null,
): Promise<void> {
  const { data: globalAllowed, error: globalError } = await supabase.rpc(
    "check_global_sms_quota",
    {
      p_limit: GLOBAL_SMS_LIMIT,
      p_window_seconds: GLOBAL_SMS_WINDOW_MS / 1000,
    },
  );

  if (globalError) {
    console.error("global sms quota check failed:", globalError.message);
    throw new Error("Could not process the request");
  }
  if (!globalAllowed) {
    throw new OtpRateLimitError();
  }

  const { data: allowed, error } = await supabase.rpc("check_and_record_otp_attempt", {
    p_purpose: purpose,
    p_phone_digits: phoneDigits,
    p_client_ip: clientIp,
    p_phone_limit: PHONE_LIMIT,
    p_phone_window_seconds: PHONE_WINDOW_MS / 1000,
    p_ip_limit: IP_LIMIT,
    p_ip_window_seconds: IP_WINDOW_MS / 1000,
  });

  if (error) {
    console.error("otp rate limit check failed:", error.message);
    throw new Error("Could not process the request");
  }
  if (!allowed) {
    throw new OtpRateLimitError();
  }
}

export function getClientIp(request: Request): string | null {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // Supabase Edge Functions set this when the above proxy headers are absent.
  const forwardedIp = request.headers.get("x-forwarded-for")
    ?.split(/\s*,\s*/)[0]
    ?.trim();
  if (forwardedIp) return forwardedIp;

  return null;
}
