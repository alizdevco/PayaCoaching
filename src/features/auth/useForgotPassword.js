import { useMutation } from "@tanstack/react-query";

import {
  resetPasswordAfterOtp,
  sendPasswordResetOtp,
} from "./authApi.js";

export function useSendPasswordResetOtp(options = {}) {
  return useMutation({
    mutationFn: (phone) => sendPasswordResetOtp(phone),
    retry: false,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export function useResetPassword(options = {}) {
  return useMutation({
    mutationFn: (password) => resetPasswordAfterOtp(password),
    retry: false,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
