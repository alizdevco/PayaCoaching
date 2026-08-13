import { useQuery } from "@tanstack/react-query";

import { getStudentContents } from "./contentApi.js";

export function useStudentContent(studentId) {
  return useQuery({
    queryKey: ["student-content", studentId],
    queryFn: () => getStudentContents(studentId),
    enabled: Boolean(studentId),
  });
}
