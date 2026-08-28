import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadWorkReport } from "./workReportsApi.js";

export function useUploadWorkReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      file,
      title,
      description,
      reportDate,
      onProgress,
    }) =>
      uploadWorkReport(studentId, file, {
        title,
        description,
        reportDate,
        onProgress,
      }),
    onSuccess: (_data, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ["work-reports", studentId] });
    },
  });
}
