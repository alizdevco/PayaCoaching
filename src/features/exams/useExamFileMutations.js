import { useMutation, useQueryClient } from "@tanstack/react-query";



import { deleteExamFile, uploadExamFile } from "./examsApi.js";



export function useUploadExamFile() {

  const queryClient = useQueryClient();



  return useMutation({

    mutationFn: ({ examAnalysisId, fileType, file, title, onProgress }) =>

      uploadExamFile(examAnalysisId, fileType, file, { title, onProgress }),

    onSuccess: (_data, { examDate }) => {

      queryClient.invalidateQueries({ queryKey: ["exams"] });

      if (examDate) {

        queryClient.invalidateQueries({ queryKey: ["exam-analysis", examDate] });

      }

    },

  });

}



export function useDeleteExamFile() {

  const queryClient = useQueryClient();



  return useMutation({

    mutationFn: ({ fileId }) => deleteExamFile(fileId),

    onSuccess: (_data, { examDate }) => {

      queryClient.invalidateQueries({ queryKey: ["exams"] });

      if (examDate) {

        queryClient.invalidateQueries({ queryKey: ["exam-analysis", examDate] });

      }

    },

  });

}

