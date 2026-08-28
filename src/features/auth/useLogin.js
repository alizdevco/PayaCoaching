import { useMutation } from "@tanstack/react-query";

import { signInWithPassword, getProfile } from "./authApi.js";

export function useLogin(options = {}) {
  return useMutation({
    mutationFn: async ({ identifier, password }) => {
      const data = await signInWithPassword({
        identifier,
        password,
      });

      const userId = data.user?.id;

      const profile = userId ? await getProfile(userId) : null;

      return {
        role: profile?.role ?? null,
        profile,
      };
    },

    retry: false,

    onSuccess: options.onSuccess,

    onError: options.onError,
  });
}
