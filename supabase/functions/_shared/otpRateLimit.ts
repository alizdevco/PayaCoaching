import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { OTP_RATE_LIMIT_MESSAGE } from "./phoneValidation.ts";

export type OtpPurpose = "registration" | "password_reset";

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

function phoneWindowStart(): string {
  return new Date(Date.now() - PHONE_WINDOW_MS).toISOString();
}

function ipWindowStart(): string {
  return new Date(Date.now() - IP_WINDOW_MS).toISOString();
}

/** Records the attempt after limits pass; throws OtpRateLimitError when exceeded. */
export async function assertOtpRateLimit(
  supabase: SupabaseClient,
  purpose: OtpPurpose,
  phoneDigits: string,
  clientIp: string | null,
): Promise<void> {
  const { count: phoneCount, error: phoneError } = await supabase
    .from("otp_send_attempts")
    .select("*", { count: "exact", head: true })
    .eq("purpose", purpose)
    .eq("phone_digits", phoneDigits)
    .gte("created_at", phoneWindowStart());

  if (phoneError) {
    console.error("otp rate limit phone count failed:", phoneError.message);
    throw new Error("Could not process the request");
  }
  if ((phoneCount ?? 0) >= PHONE_LIMIT) {
    throw new OtpRateLimitError();
  }

  if (clientIp) {
    const { count: ipCount, error: ipError } = await supabase
      .from("otp_send_attempts")
      .select("*", { count: "exact", head: true })
      .eq("client_ip", clientIp)
      .gte("created_at", ipWindowStart());

    if (ipError) {
      console.error("otp rate limit ip count failed:", ipError.message);
      throw new Error("Could not process the request");
    }
    if ((ipCount ?? 0) >= IP_LIMIT) {
      throw new OtpRateLimitError();
    }
  }

  const { error: insertError } = await supabase.from("otp_send_attempts").insert({
    purpose,
    phone_digits: phoneDigits,
    client_ip: clientIp,
  });

  if (insertError) {
    console.error("otp rate limit insert failed:", insertError.message);
    throw new Error("Could not process the request");
  }
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}
