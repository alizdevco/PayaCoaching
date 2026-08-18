// Server-side registration OTP: duplicate-phone check + signInWithOtp.
// Replaces anon-facing profile_exists_for_phone + client signInWithOtp.

import {
  createServiceClient,
  handlePreflight,
  jsonResponse,
} from "../_shared/edge.ts";
import {
  assertOtpRateLimit,
  getClientIp,
  OtpRateLimitError,
} from "../_shared/otpRateLimit.ts";
import {
  PHONE_ALREADY_REGISTERED_MESSAGE,
  OTP_RATE_LIMIT_MESSAGE,
  toCanonicalPhoneDigits,
  toSupabasePhone,
  validateIranianPhone,
} from "../_shared/phoneValidation.ts";

Deno.serve(async (request) => {
  try {
    const preflight = handlePreflight(request);
    if (preflight) return preflight;

    let body: { phone?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, { error: "Request body must be JSON" }, 400);
    }

    const phoneResult = validateIranianPhone(body.phone);
    if (!phoneResult.valid) {
      return jsonResponse(request, { error: phoneResult.message }, 400);
    }

    const supabase = createServiceClient();
    const phoneDigits = toCanonicalPhoneDigits(phoneResult.phone);
    const clientIp = getClientIp(request);

    try {
      await assertOtpRateLimit(supabase, "registration", phoneDigits, clientIp);
    } catch (error) {
      if (error instanceof OtpRateLimitError) {
        return jsonResponse(request, { error: error.message }, 429);
      }
      console.error(
        "request-registration-otp rate limit:",
        (error as Error).message,
      );
      return jsonResponse(request, { error: "Could not process the request" }, 500);
    }

    const { data: profileExists, error: profileError } = await supabase.rpc(
      "profile_exists_for_phone",
      { lookup_phone: phoneResult.phone },
    );

    if (profileError) {
      console.error(
        "request-registration-otp profile lookup failed:",
        profileError.message,
      );
      return jsonResponse(request, { error: "Could not process the request" }, 500);
    }

    if (profileExists) {
      return jsonResponse(request, { error: PHONE_ALREADY_REGISTERED_MESSAGE }, 400);
    }

    const { data: authUserExists, error: authUserError } = await supabase.rpc(
      "auth_user_exists_for_phone",
      { lookup_phone: phoneResult.phone },
    );

    if (authUserError) {
      console.error(
        "request-registration-otp auth user lookup failed:",
        authUserError.message,
      );
      return jsonResponse(request, { error: "Could not process the request" }, 500);
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: toSupabasePhone(phoneResult.phone),
      options: {
        shouldCreateUser: !authUserExists,
      },
    });

    if (otpError) {
      console.error(
        "request-registration-otp signInWithOtp failed:",
        otpError.message,
      );
      const msg = otpError.message.toLowerCase();
      if (
        msg.includes("rate") ||
        msg.includes("security purposes") ||
        msg.includes("once every")
      ) {
        return jsonResponse(request, { error: OTP_RATE_LIMIT_MESSAGE }, 429);
      }
      return jsonResponse(
        request,
        {
          error:
            "ارسال کد تأیید ناموفق بود. لطفاً چند دقیقه دیگر دوباره تلاش کنید.",
        },
        502,
      );
    }

    return jsonResponse(request, { success: true, phone: phoneResult.phone }, 200);
  } catch (error) {
    console.error(
      "request-registration-otp unhandled:",
      (error as Error).message,
    );
    return jsonResponse(request, { error: "Could not process the request" }, 500);
  }
});
