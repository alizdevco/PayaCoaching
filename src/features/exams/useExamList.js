import { useQuery } from "@tanstack/react-query";

import { listExams } from "./examsApi.js";

export function useExamList({ publishedOnly = false } = {}) {
  return useQuery({
    queryKey: ["exams", { publishedOnly }],
    queryFn: () => listExams({ publishedOnly }),
  });
}
