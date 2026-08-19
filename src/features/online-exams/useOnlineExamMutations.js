import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createOnlineExam,
  deleteOnlineExam,
  finalizeDueOnlineExamAttempts,
  finalizeOnlineExamAttempt,
  removeOnlineExamAssignment,
  setOnlineExamAssignments,
  startOnlineExamDownload,
  updateOnlineExam,
  uploadOnlineExamPdf,
} from "./onlineExamsApi.js";

function invalidateOnlineExamQueries(queryClient, examId) {
  queryClient.invalidateQueries({ queryKey: ["online-exams"] });
  queryClient.invalidateQueries({ queryKey: ["student-online-exams"] });
  queryClient.invalidateQueries({ queryKey: ["my-online-exam-attempts"] });

  if (examId) {
    queryClient.invalidateQueries({ queryKey: ["online-exams", examId] });
    queryClient.invalidateQueries({ queryKey: ["student-online-exams", examId] });
    queryClient.invalidateQueries({ queryKey: ["online-exam-attempts", examId] });
    queryClient.invalidateQueries({ queryKey: ["online-exam-attempt", examId] });
  }
}

// Finalizing an attempt only mutates online_exam_attempts (status/score). It
// cannot change online_exams metadata, so the exam-metadata queries
// (["online-exams"] list and ["online-exams", examId] detail) are intentionally
// left untouched here — every attempt- and student-facing query is still
// invalidated.
function invalidateOnlineExamAttemptQueries(queryClient, examId) {
  queryClient.invalidateQueries({ queryKey: ["student-online-exams"] });
  queryClient.invalidateQueries({ queryKey: ["my-online-exam-attempts"] });

  if (examId) {
    queryClient.invalidateQueries({ queryKey: ["student-online-exams", examId] });
    queryClient.invalidateQueries({ queryKey: ["online-exam-attempts", examId] });
    queryClient.invalidateQueries({ queryKey: ["online-exam-attempt", examId] });
  }
}

export function useCreateOnlineExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOnlineExam,
    onSuccess: (data) => {
      invalidateOnlineExamQueries(queryClient, data.id);
    },
  });
}

export function useUpdateOnlineExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, ...fields }) => updateOnlineExam(examId, fields),
    onSuccess: (data) => {
      invalidateOnlineExamQueries(queryClient, data.id);
    },
  });
}

export function useDeleteOnlineExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOnlineExam,
    onSuccess: (_data, examId) => {
      invalidateOnlineExamQueries(queryClient, examId);
    },
  });
}

export function useUploadOnlineExamPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, file, onProgress }) =>
      uploadOnlineExamPdf(examId, file, { onProgress }),
    onSuccess: (data) => {
      invalidateOnlineExamQueries(queryClient, data.id);
    },
  });
}

export function useStartOnlineExamDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId }) => startOnlineExamDownload(examId),
    onSuccess: (data, { examId }) => {
      if (data?.attempt) {
        queryClient.setQueryData(["online-exam-attempt", examId], data.attempt);
      }
      queryClient.invalidateQueries({ queryKey: ["online-exam-attempt", examId] });
    },
  });
}

export function useFinalizeOnlineExamAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attemptId, force = true }) =>
      finalizeOnlineExamAttempt(attemptId, force),
    onSuccess: (data) => {
      invalidateOnlineExamAttemptQueries(queryClient, data.exam_id);
    },
  });
}

export function useFinalizeDueOnlineExamAttempts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: finalizeDueOnlineExamAttempts,
    onSuccess: (_count, examId) => {
      invalidateOnlineExamAttemptQueries(queryClient, examId);
    },
  });
}

export function useSetOnlineExamAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, studentIds }) =>
      setOnlineExamAssignments(examId, studentIds),
    onSuccess: (_data, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ["online-exam-assignments", examId] });
      queryClient.invalidateQueries({ queryKey: ["student-online-exam-assignments"] });
      invalidateOnlineExamQueries(queryClient, examId);
    },
  });
}

export function useRemoveOnlineExamAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, studentId }) =>
      removeOnlineExamAssignment(examId, studentId),
    onSuccess: (_data, { examId, studentId }) => {
      queryClient.invalidateQueries({
        queryKey: ["student-online-exam-assignments", studentId],
      });
      queryClient.invalidateQueries({ queryKey: ["online-exam-assignments", examId] });
      invalidateOnlineExamQueries(queryClient, examId);
    },
  });
}
