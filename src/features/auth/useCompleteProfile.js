// Mutation for completing or updating the current student's profile.

import { useMutation } from "@tanstack/react-query";

import { updateOwnProfile } from "./authApi.js";

export function useCompleteProfile(options = {}) {
  return useMutation({
    mutationFn: updateOwnProfile,
    retry: false,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
