import { useQuery } from "@tanstack/react-query";

import { listExams } from "./examsApi.js";

export function useExamList({ publishedOnly = false, page, pageSize } = {}) {
  return useQuery({
    queryKey: ["exams", { publishedOnly, page, pageSize }],
    queryFn: () => listExams({ publishedOnly, page, pageSize }),
  });
}
