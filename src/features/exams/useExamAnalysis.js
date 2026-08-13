import { useQuery } from "@tanstack/react-query";

import { getExamAnalysis } from "./examsApi.js";

export function useExamAnalysis(examDate) {
  return useQuery({
    queryKey: ["exam-analysis", examDate],
    queryFn: () => getExamAnalysis(examDate),
    enabled: Boolean(examDate),
  });
}
