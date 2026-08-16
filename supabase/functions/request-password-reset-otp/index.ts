// Server-side password-reset OTP: eligibility check + signInWithOtp.
// Replaces anon-facing student_can_reset_password / profile_exists_for_phone.

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
  INCOMPLETE_REGISTRATION_MESSAGE,
  PHONE_NOT_REGISTERED_MESSAGE,
  toCanonicalPhoneDigits,
  toSupabasePhone,
  validateIranianPhone,
} from "../_shared/phoneValidation.ts";

Deno.serve(async (request) => {
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
    await assertOtpRateLimit(supabase, "password_reset", phoneDigits, clientIp);
  } catch (error) {
    if (error instanceof OtpRateLimitError) {
      return jsonResponse(request, { error: error.message }, 429);
    }
    console.error("request-password-reset-otp rate limit:", (error as Error).message);
    return jsonResponse(request, { error: "Could not process the request" }, 500);
  }

  const { data: canReset, error: resetError } = await supabase.rpc(
    "student_can_reset_password",
    { lookup_phone: phoneResult.phone },
  );

  if (resetError) {
    console.error(
      "request-password-reset-otp reset eligibility failed:",
      resetError.message,
    );
    return jsonResponse(request, { error: "Could not process the request" }, 500);
  }

  if (canReset) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: toSupabasePhone(phoneResult.phone),
    });

    if (otpError) {
      console.error(
        "request-password-reset-otp signInWithOtp failed:",
        otpError.message,
      );
      return jsonResponse(request, { error: otpError.message }, 502);
    }

    return jsonResponse(request, { success: true, phone: phoneResult.phone }, 200);
  }

  const { data: profileExists, error: profileError } = await supabase.rpc(
    "profile_exists_for_phone",
    { lookup_phone: phoneResult.phone },
  );

  if (profileError) {
    console.error(
      "request-password-reset-otp profile lookup failed:",
      profileError.message,
    );
    return jsonResponse(request, { error: PHONE_NOT_REGISTERED_MESSAGE }, 400);
  }

  if (profileExists) {
    return jsonResponse(request, { error: INCOMPLETE_REGISTRATION_MESSAGE }, 400);
  }

  return jsonResponse(request, { error: PHONE_NOT_REGISTERED_MESSAGE }, 400);
});
