import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createExam,
  deleteExam,
  publishExam,
  unpublishExam,
  updateExam,
} from "./examsApi.js";

function invalidateExamQueries(queryClient, examDate) {
  queryClient.invalidateQueries({ queryKey: ["exams"] });
  if (examDate) {
    queryClient.invalidateQueries({ queryKey: ["exam-analysis", examDate] });
  }
}

export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExam,
    onSuccess: (data) => {
      invalidateExamQueries(queryClient, data.exam_date);
    },
  });
}

export function useUpdateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, ...fields }) => updateExam(examId, fields),
    onSuccess: (data) => {
      invalidateExamQueries(queryClient, data.exam_date);
    },
  });
}

export function usePublishExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishExam,
    onSuccess: (data) => {
      invalidateExamQueries(queryClient, data.exam_date);
    },
  });
}

export function useUnpublishExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unpublishExam,
    onSuccess: (data) => {
      invalidateExamQueries(queryClient, data.exam_date);
    },
  });
}

export function useDeleteExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam-analysis"] });
    },
  });
}
