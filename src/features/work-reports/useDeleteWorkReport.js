import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteWorkReport } from "./workReportsApi.js";

export function useDeleteWorkReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
    },
  });
}
