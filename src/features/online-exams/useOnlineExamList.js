import { useQuery } from "@tanstack/react-query";

import {
  getOnlineExam,
  getStudentOnlineExam,
  listMyOnlineExamAttempts,
  listOnlineExamAssignedStudents,
  listOnlineExamAttemptsWithLazyFinalize,
  listOnlineExams,
  listStudentOnlineExamAssignments,
  listStudentOnlineExams,
} from "./onlineExamsApi.js";

export function useOnlineExamList() {
  return useQuery({
    queryKey: ["online-exams"],
    queryFn: listOnlineExams,
  });
}

export function useOnlineExam(examId) {
  return useQuery({
    queryKey: ["online-exams", examId],
    queryFn: () => getOnlineExam(examId),
    enabled: Boolean(examId),
  });
}

export function useStudentOnlineExamList(options = {}) {
  return useQuery({
    queryKey: ["student-online-exams"],
    queryFn: listStudentOnlineExams,
    refetchInterval: options.refetchInterval,
  });
}

export function useMyOnlineExamAttempts() {
  return useQuery({
    queryKey: ["my-online-exam-attempts"],
    queryFn: listMyOnlineExamAttempts,
  });
}

export function useStudentOnlineExam(examId) {
  return useQuery({
    queryKey: ["student-online-exams", examId],
    queryFn: () => getStudentOnlineExam(examId),
    enabled: Boolean(examId),
  });
}

export function useOnlineExamAttempts(examId) {
  return useQuery({
    queryKey: ["online-exam-attempts", examId],
    queryFn: () => listOnlineExamAttemptsWithLazyFinalize(examId),
    enabled: Boolean(examId),
  });
}

export function useOnlineExamAssignedStudents(examId) {
  return useQuery({
    queryKey: ["online-exam-assignments", examId],
    queryFn: () => listOnlineExamAssignedStudents(examId),
    enabled: Boolean(examId),
  });
}

export function useStudentOnlineExamAssignments(studentId) {
  return useQuery({
    queryKey: ["student-online-exam-assignments", studentId],
    queryFn: () => listStudentOnlineExamAssignments(studentId),
    enabled: Boolean(studentId),
  });
}
