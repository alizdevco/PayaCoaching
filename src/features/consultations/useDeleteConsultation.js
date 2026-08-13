import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteConsultation } from "./consultationsApi.js";

export function useDeleteConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConsultation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
    },
  });
}
