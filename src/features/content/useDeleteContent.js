import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteContent } from "./contentApi.js";

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-content"] });
    },
  });
}
