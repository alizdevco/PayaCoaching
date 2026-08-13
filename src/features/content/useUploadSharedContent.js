import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadSharedContent } from "./contentApi.js";

export function useUploadSharedContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileType, file, title, onProgress }) =>
      uploadSharedContent(fileType, file, { title, onProgress }),
    onSuccess: () => {
      // Every student's content list may now include this shared file.
      queryClient.invalidateQueries({ queryKey: ["student-content"] });
    },
  });
}
