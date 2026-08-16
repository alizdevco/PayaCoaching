import { supabase } from "../../lib/supabase.js";
import { invokeEdgeFunction } from "../../lib/edgeFunctions.js";
import { isDefinitiveProfileLoadFailure } from "./authMutationErrors.js";
import {
  toSupabasePhone,
  validateIranianPhone,
} from "./phoneValidation.js";

const PROFILE_LOAD_RETRY_DELAY_MS = 2500;

export {
  validateIranianPhone,
  trimIranianPhone,
  toSupabasePhone,
  toCanonicalPhoneDigits,
  phoneLookupVariants,
  PHONE_ALREADY_REGISTERED_MESSAGE,
  PHONE_NOT_REGISTERED_MESSAGE,
  INCOMPLETE_REGISTRATION_MESSAGE,
} from "./phoneValidation.js";

export function normalizePhone(rawPhone) {
  return toSupabasePhone(rawPhone);
}

export async function signInWithPassword({ identifier, password }) {
  const isEmail = String(identifier || "").includes("@");

  const credentials = isEmail
    ? { email: identifier.trim(), password }
    : { phone: normalizePhone(identifier), password };

  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    throw error;
  }
  return data;
}

// Save first/last name onto the current user's own profile row.
export async function updateOwnProfileNames({ firstName, lastName }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

// Complete (or update) the current student's profile. Only allowed profile
// fields are sent — never id or role. Sets profile_completed_at on success.
export async function updateOwnProfile({
  firstName,
  lastName,
  province,
  city,
  consultantName,
  grade,
  academicMajor,
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) {
    throw new Error("برای تکمیل پروفایل باید وارد حساب کاربری شوید.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      province,
      city,
      consultant_name: consultantName,
      grade,
      academic_major: academicMajor,
      profile_completed_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

function isSamePasswordError(error) {
  const code = String(error?.code ?? "").toLowerCase();
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code === "same_password" ||
    message.includes("different from the old password")
  );
}

// Set password on the currently authenticated user (after OTP verification).
export async function setOwnPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error && isSamePasswordError(error)) {
    // Password already set to this value (e.g. retry after a partial registration).
    const { data: currentUserData } = await supabase.auth.getUser();
    return { user: currentUserData.user };
  }
  if (error) {
    throw error;
  }
  return data;
}

// Create account after OTP verification, then save the full profile in one flow.
// OTP verification already created the auth user + session via verifyOtp().
export async function registerStudentWithProfile(params) {
  await setOwnPassword(params.password);

  const { error: ensureProfileError } =
    await supabase.rpc("ensure_own_profile");
  if (ensureProfileError) {
    throw ensureProfileError;
  }

  return updateOwnProfile({
    firstName: params.firstName,
    lastName: params.lastName,
    province: params.province,
    city: params.city,
    consultantName: params.consultantName,
    grade: params.grade,
    academicMajor: params.academicMajor,
  });
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

// Read the role and profile for a given user id. Role is always read from
// profiles.role — never from localStorage or the JWT.
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getProfileWithRetry(
  userId,
  { maxRetries = 1, retryDelayMs = PROFILE_LOAD_RETRY_DELAY_MS } = {},
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await getProfile(userId);
    } catch (error) {
      lastError = error;
      if (isDefinitiveProfileLoadFailure(error) || attempt >= maxRetries) {
        throw error;
      }
      await delay(retryDelayMs);
    }
  }

  throw lastError;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
}

// ---------------------------------------------------------------------------
// Phone OTP via Supabase Auth. Local dev phones use [auth.sms.test_otp] in
// supabase/config.toml; on the remote project the Send SMS hook forwards the
// code to the send-sms Edge Function, which relays it to sms.ir.
// ---------------------------------------------------------------------------

// Request a phone OTP via the registration Edge Function (server-side duplicate check).
export async function sendOtp(phone) {
  const result = validateIranianPhone(phone);
  if (!result.valid) {
    throw new Error(result.message);
  }

  await invokeEdgeFunction("request-registration-otp", {
    phone: result.phone,
  });

  return { success: true, phone: result.phone };
}

// Verify the OTP with Supabase Auth and establish a session.
export async function verifyOtp({ phone, code }) {
  const normalizedPhone = normalizePhone(phone);

  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: String(code || "").trim(),
    type: "sms",
  });

  if (error) {
    throw error;
  }

  return { success: true, phone: normalizedPhone, session: data.session };
}

// Request a phone OTP for password reset via the server-side Edge Function.
export async function sendPasswordResetOtp(phone) {
  const result = validateIranianPhone(phone);
  if (!result.valid) {
    throw new Error(result.message);
  }

  await invokeEdgeFunction("request-password-reset-otp", {
    phone: result.phone,
  });

  return { success: true, phone: result.phone };
}

export const PASSWORD_CHANGED_SIGNOUT_FAILED_CODE =
  "PASSWORD_CHANGED_SIGNOUT_FAILED";

export function isPasswordChangedSignOutFailed(error) {
  return error?.code === PASSWORD_CHANGED_SIGNOUT_FAILED_CODE;
}

function createPasswordChangedSignOutFailedError(cause) {
  const error = new Error("Password changed but sign-out failed");
  error.code = PASSWORD_CHANGED_SIGNOUT_FAILED_CODE;
  error.cause = cause;
  return error;
}

// Set a new password after OTP verification, then sign out.
export async function resetPasswordAfterOtp(password) {
  await setOwnPassword(password);
  try {
    await signOut();
  } catch (error) {
    console.error("[resetPasswordAfterOtp] signOut failed:", error?.message);
    throw createPasswordChangedSignOutFailedError(error);
  }
}
