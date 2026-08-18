// Mutations for the 3-step student registration flow.
//   Step 1: request an OTP for a phone number.
//   Step 2: verify the OTP, which also creates the session.
//   Step 3: set password and save the full profile via ensure_own_profile().
// Phone OTP signups defer profile creation until Step 3 (not on auth.users insert).

import { useMutation } from "@tanstack/react-query";

import { sendOtp, verifyOtp, registerStudentWithProfile } from "./authApi.js";

export function useSendOtp(options = {}) {
  return useMutation({
    mutationFn: (phone) => sendOtp(phone),
    retry: false,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export function useVerifyOtp(options = {}) {
  return useMutation({
    mutationFn: ({ phone, code }) => verifyOtp({ phone, code }),
    retry: false,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export function useRegisterWithProfile(options = {}) {
  return useMutation({
    mutationFn: registerStudentWithProfile,
    retry: false,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
