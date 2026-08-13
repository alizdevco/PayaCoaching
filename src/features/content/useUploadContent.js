import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadFile } from "./contentApi.js";

export function useUploadContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, fileType, file, title, reportDate, onProgress }) =>
      uploadFile(studentId, fileType, file, { title, reportDate, onProgress }),
    onSuccess: (_data, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ["student-content", studentId] });
    },
  });
}
