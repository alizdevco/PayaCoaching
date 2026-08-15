import { useMutation, useQueryClient } from "@tanstack/react-query";



import { uploadSharedContent, uploadSharedLink } from "./contentApi.js";



export function useUploadSharedContent() {

  const queryClient = useQueryClient();



  return useMutation({

    mutationFn: ({ fileType, file, title, url, onProgress }) => {

      if (fileType === "link") {

        return uploadSharedLink(title, url);

      }

      return uploadSharedContent(fileType, file, { title, onProgress });

    },

    onSuccess: () => {

      // Every student's content list may now include this shared file.

      queryClient.invalidateQueries({ queryKey: ["student-content"] });

    },

  });

}

