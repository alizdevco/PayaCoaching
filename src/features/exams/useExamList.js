import { useQuery } from "@tanstack/react-query";

import { listExams } from "./examsApi.js";

export function examListQueryOptions({ publishedOnly = false, page, pageSize } = {}) {
  return {
    queryKey: ["exams", { publishedOnly, page, pageSize }],
    queryFn: () => listExams({ publishedOnly, page, pageSize }),
  };
}

export function useExamList(options = {}) {
  return useQuery(examListQueryOptions(options));
}
